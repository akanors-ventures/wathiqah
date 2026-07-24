import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { ProjectTransactionsService } from './project-transactions.service';
import { ProjectTransactionsResolver } from './project-transactions.resolver';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [
    ProjectsResolver,
    ProjectsService,
    ProjectTransactionsService,
    ProjectTransactionsResolver,
    PrismaService,
  ],
  exports: [ProjectsService, ProjectTransactionsService],
})
export class ProjectsModule {}
