import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogProjectTransactionInput } from './dto/log-project-transaction.input';
import { ProjectTransactionType } from '../../generated/prisma/client';

@Injectable()
export class ProjectTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: LogProjectTransactionInput) {
    const { projectId, amount, type } = input;

    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    if (amount <= 0) {
      throw new BadRequestException(
        'Transaction amount must be greater than zero',
      );
    }

    // Use a transaction to ensure atomic updates
    return this.prisma.$transaction(async (tx) => {
      // Create the transaction
      const transaction = await tx.projectTransaction.create({
        data: input,
      });

      // Update project balance
      let balanceChange = amount;
      if (type === ProjectTransactionType.EXPENSE) {
        balanceChange = -amount;
      }

      await tx.project.update({
        where: { id: projectId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      return transaction;
    });
  }

  async findAllByProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return this.prisma.projectTransaction.findMany({
      where: { projectId },
      orderBy: { date: 'desc' },
    });
  }
}
