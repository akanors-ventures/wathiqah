import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AdminService } from './admin.service';
import { AdminResolver } from './admin.resolver';

@Module({
  imports: [PrismaModule, NotificationsModule, UsersModule],
  providers: [AdminService, AdminResolver],
  exports: [AdminService],
})
export class AdminModule {}
