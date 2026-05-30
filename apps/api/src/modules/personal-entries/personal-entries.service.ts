import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PersonalEntryType } from '../../generated/prisma/client';
import { CreatePersonalEntryInput } from './dto/create-personal-entry.input';
import { UpdatePersonalEntryInput } from './dto/update-personal-entry.input';
import { FilterPersonalEntryInput } from './dto/filter-personal-entry.input';
import { PaginatedPersonalEntriesResponse } from './entities/paginated-personal-entries-response.entity';
import { PersonalEntrySummary } from './entities/personal-entry-summary.entity';

@Injectable()
export class PersonalEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreatePersonalEntryInput) {
    return this.prisma.personalEntry.create({
      data: { ...input, createdById: userId },
    });
  }

  private buildWhere(
    userId: string,
    filter?: FilterPersonalEntryInput,
  ): Prisma.PersonalEntryWhereInput {
    return {
      createdById: userId,
      ...(filter?.type && { type: filter.type }),
      ...(filter?.currency && { currency: filter.currency }),
      ...(filter?.search && {
        OR: [
          { description: { contains: filter.search, mode: 'insensitive' } },
          { category: { contains: filter.search, mode: 'insensitive' } },
        ],
      }),
      ...((filter?.startDate || filter?.endDate) && {
        date: {
          ...(filter?.startDate && { gte: filter.startDate }),
          ...(filter?.endDate && { lte: filter.endDate }),
        },
      }),
    };
  }

  async findAll(
    userId: string,
    filter?: FilterPersonalEntryInput,
  ): Promise<PaginatedPersonalEntriesResponse> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 25;
    const where = this.buildWhere(userId, filter);

    const [total, items] = await Promise.all([
      this.prisma.personalEntry.count({ where }),
      this.prisma.personalEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items as unknown as PaginatedPersonalEntriesResponse['items'],
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string) {
    const entry = await this.prisma.personalEntry.findUnique({ where: { id } });
    if (!entry || entry.createdById !== userId) {
      throw new NotFoundException(`Personal entry with ID ${id} not found`);
    }
    return entry;
  }

  async update(userId: string, input: UpdatePersonalEntryInput) {
    await this.findOne(input.id, userId);
    return this.prisma.personalEntry.update({
      where: { id: input.id },
      data: {
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        category: input.category,
        date: input.date,
        description: input.description,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(id, userId);
    await this.prisma.personalEntry.delete({ where: { id } });
    return true;
  }

  async getSummary(
    userId: string,
    filter?: FilterPersonalEntryInput,
  ): Promise<PersonalEntrySummary> {
    const where = this.buildWhere(userId, filter);
    const results = await this.prisma.personalEntry.groupBy({
      by: ['type'],
      where,
      _sum: { amount: true },
    });

    const totalIncome =
      results
        .find((r) => r.type === PersonalEntryType.INCOME)
        ?._sum.amount?.toNumber() ?? 0;
    const totalExpenses =
      results
        .find((r) => r.type === PersonalEntryType.EXPENSE)
        ?._sum.amount?.toNumber() ?? 0;

    return {
      totalIncome,
      totalExpenses,
      netCashPosition: totalIncome - totalExpenses,
      currency: filter?.currency ?? 'NGN',
    };
  }
}
