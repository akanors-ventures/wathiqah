import { Module } from '@nestjs/common';
import { OrgEventsService } from './org-events.service';
import { OrgEventsResolver } from './org-events.resolver';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrgRolesGuard } from '../organisations/guards/org-roles.guard';

@Module({
  imports: [PrismaModule],
  providers: [OrgEventsResolver, OrgEventsService, OrgRolesGuard],
})
export class OrgEventsModule {}
