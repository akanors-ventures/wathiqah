import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, ProjectTransactionType } from '../../generated/prisma/client';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import {
  FilterProjectInput,
  ProjectBalanceStanding,
} from './dto/filter-project.input';
import { PaginatedProjectsResponse } from './entities/paginated-projects-response.entity';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateProjectInput) {
    return this.prisma.project.create({
      data: {
        ...input,
        userId,
      },
    });
  }

  async findAll(
    userId: string,
    filter?: FilterProjectInput,
  ): Promise<PaginatedProjectsResponse> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 25;

    // Balance standing requires raw SQL (column-vs-column comparison)
    if (
      filter?.balanceStanding &&
      filter.balanceStanding !== ProjectBalanceStanding.ALL
    ) {
      const isOverBudget =
        filter.balanceStanding === ProjectBalanceStanding.OVER_BUDGET;

      const rawIds = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "projects"
        WHERE "userId" = ${userId}
        AND "budget" IS NOT NULL
        AND ${isOverBudget ? Prisma.sql`"balance" > "budget"` : Prisma.sql`"balance" <= "budget"`}
        ${filter?.search ? Prisma.sql`AND "name" ILIKE ${'%' + filter.search + '%'}` : Prisma.empty}
        ${filter?.status ? Prisma.sql`AND "status" = ${filter.status}::"ProjectStatus"` : Prisma.empty}
      `;

      const ids = rawIds.map((r) => r.id);
      const total = ids.length;
      const items = await this.prisma.project.findMany({
        where: { id: { in: ids } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { items: items as unknown as PaginatedProjectsResponse['items'], total, page, limit };
    }

    const where: Prisma.ProjectWhereInput = {
      userId,
      ...(filter?.search && {
        name: { contains: filter.search, mode: 'insensitive' },
      }),
      ...(filter?.status && { status: filter.status }),
    };

    const [total, items] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items: items as unknown as PaginatedProjectsResponse['items'], total, page, limit };
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async getTransactionTotals(
    projectId: string,
  ): Promise<{ totalIncome: number; totalExpenses: number }> {
    const results = await this.prisma.projectTransaction.groupBy({
      by: ['type'],
      where: { projectId },
      _sum: { amount: true },
    });

    const income =
      results
        .find((r) => r.type === ProjectTransactionType.INCOME)
        ?._sum.amount?.toNumber() ?? 0;
    const expenses =
      results
        .find((r) => r.type === ProjectTransactionType.EXPENSE)
        ?._sum.amount?.toNumber() ?? 0;

    return { totalIncome: income, totalExpenses: expenses };
  }

  async update(userId: string, input: UpdateProjectInput) {
    // Verify ownership
    await this.findOne(input.id, userId);

    return this.prisma.project.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        budget: input.budget,
        currency: input.currency,
        status: input.status,
        category: input.category,
      },
    });
  }
}
