import { Module } from '@nestjs/common';
import { ProjectContactLinkService } from './project-contact-link.service';
import { ProjectContactLinkResolver } from './project-contact-link.resolver';
import { TransactionsModule } from '../transactions/transactions.module';
import { ProjectsModule } from '../projects/projects.module';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [TransactionsModule, ProjectsModule],
  providers: [
    ProjectContactLinkService,
    ProjectContactLinkResolver,
    PrismaService,
  ],
  exports: [ProjectContactLinkService],
})
export class ProjectContactLinksModule {}
