import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import type { PubSub } from 'graphql-subscriptions';
import { PrismaService } from '../../prisma/prisma.service';
import { PUB_SUB } from '../../common/pubsub/pubsub.module';
import { CreateNoteInput } from './dto/create-note.input';
import { UpdateNoteInput } from './dto/update-note.input';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  async create(input: CreateNoteInput, createdById: string, orgId?: string) {
    const note = await this.prisma.note.create({
      data: {
        createdById,
        orgId: orgId ?? null,
        title: input.title,
        body: input.body,
        category: input.category,
      },
    });
    if (orgId) {
      await this.pubSub.publish('orgNoteCreated', {
        orgNoteCreated: note,
        orgId,
      });
    }
    return note;
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
    const note = await this.prisma.note.update({
      where: { id },
      data: {
        title: input.title ?? undefined,
        body: input.body,
        category: input.category ?? undefined,
      },
    });
    await this.pubSub.publish('orgNoteUpdated', {
      orgNoteUpdated: note,
      orgId,
    });
    return note;
  }

  async removeOrgNote(id: string, orgId: string) {
    await this.assertOrgOwnership(id, orgId);
    await this.prisma.note.delete({ where: { id } });
    await this.pubSub.publish('orgNoteRemoved', {
      orgNoteRemoved: id,
      orgId,
    });
    return true;
  }

  private async assertOrgOwnership(id: string, orgId: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.orgId !== orgId)
      throw new ForbiddenException('Note does not belong to this org');
  }
}
