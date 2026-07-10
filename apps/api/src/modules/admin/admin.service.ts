import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service';
import { NotificationTemplates } from '../in-app-notifications/notification-templates';
import {
  AdminAction,
  Prisma,
  SubscriptionTier,
  UserRole,
} from '../../generated/prisma/client';
import {
  escapeLikeWildcards,
  normalizeEmail,
} from '../../common/utils/string.utils';
import { getPrismaSkip } from '../../common/dto/pagination.input';
import { AdminUsersFilterInput } from './dto/admin-users-filter.input';
import { AdminAuditLogFilterInput } from './dto/admin-audit-log-filter.input';
import type { User } from '../../generated/prisma/client';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly inAppNotificationsService: InAppNotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.bootstrapSuperAdmin();
  }

  async bootstrapSuperAdmin(): Promise<void> {
    const email = this.configService.get<string>('admin.email');
    const password = this.configService.get<string>('admin.password');
    const name = this.configService.get<string>('admin.name');

    if (!email || !password || !name) {
      this.logger.debug(
        'ADMIN_EMAIL/PASSWORD/NAME not set — skipping super admin bootstrap',
      );
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // Always verify the provided password matches the stored hash
      const passwordMatches = existingUser.passwordHash
        ? await bcrypt.compare(password, existingUser.passwordHash)
        : false;

      if (!passwordMatches) {
        throw new Error(
          `[AdminService] Bootstrap failed: ADMIN_PASSWORD does not match the stored password for ${normalizedEmail}. Correct the env var or reset the password in the database.`,
        );
      }

      if (existingUser.role === UserRole.SUPER_ADMIN) {
        this.logger.debug(
          `Super admin ${normalizedEmail} verified — skipping bootstrap`,
        );
        return;
      }

      // Promote existing user to SUPER_ADMIN
      this.logger.warn(
        `Promoting existing user ${normalizedEmail} to SUPER_ADMIN via bootstrap`,
      );
      await this.prisma.user.update({
        where: { email: normalizedEmail },
        data: { role: UserRole.SUPER_ADMIN },
      });
      this.logger.log(
        `Super admin bootstrapped (promoted): ${normalizedEmail}`,
      );
      return;
    }

    // No user with ADMIN_EMAIL — ensure no other super admin exists first
    const anyExistingSuperAdmin = await this.prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (anyExistingSuperAdmin) {
      throw new Error(
        `[AdminService] Bootstrap failed: a super admin already exists (${anyExistingSuperAdmin.email}) but ADMIN_EMAIL is set to ${normalizedEmail}. Update ADMIN_EMAIL to match the existing super admin account.`,
      );
    }

    // Fresh install — create super admin
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || '';
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        role: UserRole.SUPER_ADMIN,
        isEmailVerified: true,
        preferredCurrency: 'NGN',
      },
    });

    this.logger.log(`Super admin bootstrapped: ${normalizedEmail}`);
  }

  /** Builds the audit-log-create Prisma operation for inclusion in a $transaction array. */
  private auditEntry(
    actorId: string,
    action: AdminAction,
    targetUserId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.adminAuditLog.create({
      data: { actorId, action, targetUserId, metadata },
    });
  }

  async provisionPro(
    adminId: string,
    userId: string,
    expiresAt: Date,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier: SubscriptionTier.PRO,
          status: 'active',
          provider: 'ADMIN',
          isProvisioned: true,
          provisionedById: adminId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: expiresAt,
        },
        update: {
          tier: SubscriptionTier.PRO,
          status: 'active',
          provider: 'ADMIN',
          isProvisioned: true,
          provisionedById: adminId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { tier: SubscriptionTier.PRO },
      }),
      this.auditEntry(adminId, AdminAction.PROVISION_PRO, userId, {
        expiresAt: expiresAt.toISOString(),
      }),
    ]);

    await this.notificationService.sendProvisioningNotification({
      notificationType: 'granted',
      email: user.email,
      name: user.firstName,
      expiresAt,
    });

    this.inAppNotificationsService.createSafely(
      { userId, ...NotificationTemplates.provisioningGranted(expiresAt) },
      `provisioning grant (${userId})`,
    );

    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  async deprovisionPro(adminId: string, userId: string): Promise<User> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, isProvisioned: true },
      include: { user: true },
    });
    if (!subscription) {
      throw new NotFoundException(
        `No provisioned Pro subscription found for user ${userId}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          tier: SubscriptionTier.FREE,
          status: 'canceled',
          isProvisioned: false,
          currentPeriodEnd: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { tier: SubscriptionTier.FREE },
      }),
      this.auditEntry(adminId, AdminAction.DEPROVISION_PRO, userId),
    ]);

    await this.notificationService.sendProvisioningNotification({
      notificationType: 'revoked',
      email: subscription.user.email,
      name: subscription.user.firstName,
    });

    this.inAppNotificationsService.createSafely(
      { userId, ...NotificationTemplates.provisioningRevoked() },
      `provisioning revoke (${userId})`,
    );

    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  async setUserRole(
    adminId: string,
    userId: string,
    role: UserRole,
  ): Promise<User> {
    if (role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'SUPER_ADMIN role cannot be assigned via this mutation — it is reserved for the bootstrap account.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Cannot change the role of a SUPER_ADMIN account.',
      );
    }

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { role },
      }),
      this.auditEntry(adminId, AdminAction.SET_USER_ROLE, userId, {
        role,
        previousRole: user.role,
      }),
    ]);

    await this.notificationService.sendRoleChangeNotification({
      notificationType: role === UserRole.ADMIN ? 'promoted' : 'demoted',
      email: user.email,
      name: user.firstName,
    });

    this.inAppNotificationsService.createSafely(
      {
        userId,
        ...NotificationTemplates.roleChanged(role === UserRole.ADMIN),
      },
      `role change (${userId})`,
    );

    return updatedUser;
  }

  async getUsers(filter: AdminUsersFilterInput): Promise<{
    items: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { search, role, tier, page = 1, limit = 25 } = filter;

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role;
    if (tier) where.tier = tier;
    if (search?.trim()) {
      const term = escapeLikeWildcards(search.trim());
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: getPrismaSkip(page, limit),
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async getStats(): Promise<{
    totalUsers: number;
    freeUsers: number;
    proUsers: number;
    provisionedProUsers: number;
    adminUsers: number;
    newUsersLast30Days: number;
    activeSubscriptions: number;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      freeUsers,
      proUsers,
      provisionedProUsers,
      adminUsers,
      newUsersLast30Days,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { tier: SubscriptionTier.FREE } }),
      this.prisma.user.count({ where: { tier: SubscriptionTier.PRO } }),
      this.prisma.subscription.count({ where: { isProvisioned: true } }),
      this.prisma.user.count({
        where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.subscription.count({ where: { status: 'active' } }),
    ]);

    return {
      totalUsers: freeUsers + proUsers,
      freeUsers,
      proUsers,
      provisionedProUsers,
      adminUsers,
      newUsersLast30Days,
      activeSubscriptions,
    };
  }

  async getAuditLogs(filter: AdminAuditLogFilterInput): Promise<{
    items: Prisma.AdminAuditLogGetPayload<{
      include: { actor: true; targetUser: true };
    }>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { action, page = 1, limit = 25 } = filter;

    const where: Prisma.AdminAuditLogWhereInput = {};
    if (action) where.action = action;

    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        include: { actor: true, targetUser: true },
        orderBy: { createdAt: 'desc' },
        skip: getPrismaSkip(page, limit),
        take: limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
