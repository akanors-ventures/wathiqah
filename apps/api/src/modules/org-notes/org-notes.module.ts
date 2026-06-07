import { Module } from '@nestjs/common';
import { OrgNotesService } from './org-notes.service';
import { OrgNotesResolver } from './org-notes.resolver';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrgRolesGuard } from '../organisations/guards/org-roles.guard';

@Module({
  imports: [PrismaModule],
  providers: [OrgNotesResolver, OrgNotesService, OrgRolesGuard],
})
export class OrgNotesModule {}
