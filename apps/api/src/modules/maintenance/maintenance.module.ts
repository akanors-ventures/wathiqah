import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceProcessor } from './maintenance.processor';
import { ExchangeRateModule } from '../exchange-rate/exchange-rate.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'maintenance' }),
    ExchangeRateModule,
    NotificationsModule,
    PrismaModule,
  ],
  providers: [MaintenanceService, MaintenanceProcessor],
})
export class MaintenanceModule {}
