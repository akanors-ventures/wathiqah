import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrgEventInput } from './dto/create-org-event.input';
import { UpdateOrgEventInput } from './dto/update-org-event.input';

@Injectable()
export class OrgEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOrgEventInput, orgId: string, userId: string) {
    return this.prisma.orgEvent.create({
      data: {
        orgId,
        createdById: userId,
        title: input.title,
        date: new Date(input.date),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        category: input.category,
        notes: input.notes,
        isRecurring: input.isRecurring ?? false,
        recurrence: input.recurrence,
      },
    });
  }

  async findUpcoming(orgId: string, category?: string) {
    return this.prisma.orgEvent.findMany({
      where: {
        orgId,
        date: { gte: new Date() },
        ...(category ? { category } : {}),
      },
      orderBy: { date: 'asc' },
    });
  }

  async findAll(orgId: string, category?: string) {
    return this.prisma.orgEvent.findMany({
      where: { orgId, ...(category ? { category } : {}) },
      orderBy: { date: 'asc' },
    });
  }

  async usedCategories(orgId: string): Promise<string[]> {
    const rows = await this.prisma.orgEvent.findMany({
      where: { orgId },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  async update(id: string, input: UpdateOrgEventInput, orgId: string) {
    await this.assertOwnership(id, orgId);
    return this.prisma.orgEvent.update({
      where: { id },
      data: {
        ...input,
        date: input.date ? new Date(input.date) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      },
    });
  }

  async remove(id: string, orgId: string) {
    await this.assertOwnership(id, orgId);
    await this.prisma.orgEvent.delete({ where: { id } });
    return true;
  }

  private async assertOwnership(id: string, orgId: string) {
    const event = await this.prisma.orgEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.orgId !== orgId)
      throw new ForbiddenException('Event does not belong to this org');
  }
}
