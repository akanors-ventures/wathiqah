import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrgNoteInput } from './dto/create-org-note.input';
import { UpdateOrgNoteInput } from './dto/update-org-note.input';

@Injectable()
export class OrgNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrgNoteInput, orgId: string, userId: string) {
    return this.prisma.orgNote.create({
      data: {
        orgId,
        createdById: userId,
        body: input.body,
        category: input.category,
      },
    });
  }

  async findAll(orgId: string, category?: string) {
    return this.prisma.orgNote.findMany({
      where: { orgId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, input: UpdateOrgNoteInput, orgId: string) {
    await this.assertOwnership(id, orgId);
    return this.prisma.orgNote.update({ where: { id }, data: input });
  }

  async remove(id: string, orgId: string) {
    await this.assertOwnership(id, orgId);
    await this.prisma.orgNote.delete({ where: { id } });
    return true;
  }

  private async assertOwnership(id: string, orgId: string) {
    const note = await this.prisma.orgNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.orgId !== orgId)
      throw new ForbiddenException('Note does not belong to this org');
  }
}
