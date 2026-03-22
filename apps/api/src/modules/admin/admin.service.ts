import {
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { SubscriptionTier, UserRole } from '../../generated/prisma/client';
import { normalizeEmail } from '../../common/utils/string.utils';
import type { User } from '../../generated/prisma/client';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
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

  async provisionPro(
    adminId: string,
    userId: string,
    expiresAt: Date,
  ): Promise<User> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

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
    ]);

    await this.notificationService.sendProvisioningNotification({
      notificationType: 'granted',
      email: user.email,
      name: user.firstName,
      expiresAt,
    });

    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  async deprovisionPro(adminId: string, userId: string): Promise<User> {
    // adminId retained for future audit logging
    void adminId;

    const subscription = await this.prisma.subscription.findFirstOrThrow({
      where: { userId, isProvisioned: true },
      include: { user: true },
    });

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
    ]);

    await this.notificationService.sendProvisioningNotification({
      notificationType: 'revoked',
      email: subscription.user.email,
      name: subscription.user.firstName,
    });

    return this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
  }

  async setUserRole(
    adminId: string,
    userId: string,
    role: UserRole,
  ): Promise<User> {
    // adminId retained for future audit logging
    void adminId;

    if (role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'SUPER_ADMIN role cannot be assigned via this mutation — it is reserved for the bootstrap account.',
      );
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await this.notificationService.sendRoleChangeNotification({
      notificationType: role === UserRole.ADMIN ? 'promoted' : 'demoted',
      email: user.email,
      name: user.firstName,
    });

    return updatedUser;
  }
}
