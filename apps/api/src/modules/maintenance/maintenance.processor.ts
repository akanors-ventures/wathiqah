import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { SubscriptionTier } from '../../generated/prisma/client';

@Processor('maintenance')
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(
    private readonly exchangeRateService: ExchangeRateService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.debug(`Processing maintenance job: ${job.name}`);
    switch (job.name) {
      case 'exchange-rate-update':
        await this.exchangeRateService.updateRates();
        break;
      case 'check-provisioning-expiry':
        await this.handleCheckProvisioningExpiry();
        break;
      default:
        this.logger.warn(`Unknown maintenance job: ${job.name}`);
    }
  }

  private async handleCheckProvisioningExpiry(): Promise<void> {
    const expired = await this.prisma.subscription.findMany({
      where: {
        isProvisioned: true,
        currentPeriodEnd: { lt: new Date() },
        tier: SubscriptionTier.PRO,
      },
      include: { user: true },
    });

    for (const subscription of expired) {
      await this.prisma.$transaction([
        this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            tier: SubscriptionTier.FREE,
            status: 'canceled',
            isProvisioned: false,
          },
        }),
        this.prisma.user.update({
          where: { id: subscription.userId },
          data: { tier: SubscriptionTier.FREE },
        }),
      ]);

      await this.notificationService.sendProvisioningNotification({
        notificationType: 'expired',
        email: subscription.user.email,
        name: subscription.user.firstName,
        expiredAt: subscription.currentPeriodEnd ?? new Date(),
      });

      this.logger.log(
        `Provisioned Pro expired for user ${subscription.userId}`,
      );
    }

    this.logger.log(
      `Provisioning expiry check complete — ${expired.length} expired`,
    );
  }
}
