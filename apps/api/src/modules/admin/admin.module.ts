import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';
import { PaymentModule } from '../payment/payment.module';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    UsersModule,
    InAppNotificationsModule,
    PaymentModule,
  ],
  providers: [AdminService, AdminResolver],
  exports: [AdminService],
})
export class AdminModule {}
