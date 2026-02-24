import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { ProjectTransactionsService } from './project-transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [
    ProjectsResolver,
    ProjectsService,
    ProjectTransactionsService,
    PrismaService,
  ],
})
export class ProjectsModule {}
