import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
      this.logger.warn(
        'ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_NAME not set — skipping super admin bootstrap',
      );
      return;
    }

    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (existingAdmin) {
      this.logger.debug('Admin user already exists — skipping bootstrap');
      return;
    }

    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || '';
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedEmail = normalizeEmail(email);

    await this.prisma.user.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        role: UserRole.ADMIN,
        isEmailVerified: true,
        preferredCurrency: 'NGN',
      },
      update: { role: UserRole.ADMIN },
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

  async deprovisionPro(userId: string): Promise<User> {
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
