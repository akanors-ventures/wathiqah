import { Module } from '@nestjs/common';
import { NotesService } from './notes.service';
import { NotesResolver } from './notes.resolver';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrgRolesGuard } from '../organisations/guards/org-roles.guard';

@Module({
  imports: [PrismaModule],
  providers: [NotesResolver, NotesService, OrgRolesGuard],
})
export class NotesModule {}
