import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNoteInput } from './dto/create-note.input';
import { UpdateNoteInput } from './dto/update-note.input';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNoteInput, createdById: string, orgId?: string) {
    return this.prisma.note.create({
      data: {
        createdById,
        orgId: orgId ?? null,
        title: input.title,
        body: input.body,
        category: input.category,
      },
    });
  }

  async findByOrg(orgId: string, category?: string) {
    return this.prisma.note.findMany({
      where: { orgId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(createdById: string, category?: string) {
    return this.prisma.note.findMany({
      where: {
        createdById,
        orgId: null,
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, input: UpdateNoteInput, userId: string) {
    await this.assertOwnership(id, userId);
    return this.prisma.note.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        body: input.body,
        category: input.category ?? undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.assertOwnership(id, userId);
    await this.prisma.note.delete({ where: { id } });
    return true;
  }

  private async assertOwnership(id: string, userId: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.orgId !== null)
      throw new ForbiddenException(
        'Organisation notes must be modified through the org note mutations',
      );
    if (note.createdById !== userId)
      throw new ForbiddenException('Note does not belong to this user');
  }

  async updateOrgNote(id: string, input: UpdateNoteInput, orgId: string) {
    await this.assertOrgOwnership(id, orgId);
    return this.prisma.note.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        body: input.body,
        category: input.category ?? undefined,
      },
    });
  }

  async removeOrgNote(id: string, orgId: string) {
    await this.assertOrgOwnership(id, orgId);
    await this.prisma.note.delete({ where: { id } });
    return true;
  }

  private async assertOrgOwnership(id: string, orgId: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.orgId !== orgId)
      throw new ForbiddenException('Note does not belong to this org');
  }
}
