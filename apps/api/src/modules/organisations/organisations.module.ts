import { Module } from '@nestjs/common';
import { OrganisationsService } from './organisations.service';
import { OrganisationsResolver } from './organisations.resolver';
import { OrgRolesGuard } from './guards/org-roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OrganisationsResolver, OrganisationsService, OrgRolesGuard],
  exports: [OrganisationsService, OrgRolesGuard],
})
export class OrganisationsModule {}
