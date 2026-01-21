import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { AssetCategory } from '../../generated/prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionInput: CreateTransactionInput, userId: string) {
    const { category, amount, itemName, quantity, ...rest } =
      createTransactionInput;

    // Validation logic for category
    if (category === AssetCategory.FUNDS && !amount) {
      throw new BadRequestException(
        'Amount is required for financial transactions',
      );
    }

    if (category === AssetCategory.ITEM && !itemName) {
      throw new BadRequestException(
        'Item name is required for physical item tracking',
      );
    }

    return this.prisma.transaction.create({
      data: {
        category,
        amount,
        itemName,
        quantity: category === AssetCategory.ITEM ? quantity : null,
        createdById: userId,
        ...rest,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        OR: [
          { createdById: userId },
          // (Future) Transactions where user is a contact or witness
        ],
      },
      include: {
        contact: true,
        witnesses: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }
}
