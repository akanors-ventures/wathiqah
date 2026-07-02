import { Module } from '@nestjs/common';
import { InAppNotificationsService } from './in-app-notifications.service';
import { InAppNotificationsResolver } from './in-app-notifications.resolver';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InAppNotificationsResolver, InAppNotificationsService],
  exports: [InAppNotificationsService],
})
export class InAppNotificationsModule {}
