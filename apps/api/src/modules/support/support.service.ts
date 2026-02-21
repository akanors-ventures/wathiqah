import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupportInput } from './dto/create-support.input';
import { SupportStatus } from '../../generated/prisma/client';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSupportInput: CreateSupportInput, userId?: string) {
    const support = await this.prisma.support.create({
      data: {
        amount: createSupportInput.amount,
        currency: createSupportInput.currency,
        paymentProvider: createSupportInput.paymentProvider,
        supporterName: createSupportInput.supporterName,
        supporterEmail: createSupportInput.supporterEmail,
        message: createSupportInput.message,
        isAnonymous: createSupportInput.isAnonymous,
        supporterId: userId,
        status: SupportStatus.PENDING,
      },
    });

    return support;
  }

  async findAll() {
    return this.prisma.support.findMany({
      where: { status: SupportStatus.SUCCESSFUL },
      orderBy: { createdAt: 'desc' },
      include: { supporter: true },
    });
  }

  async findBySupporter(userId: string) {
    return this.prisma.support.findMany({
      where: { supporterId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.support.findUnique({
      where: { id },
      include: { supporter: true },
    });
  }

  getSupportOptions(currency: string = 'USD') {
    const isNGN = currency.toUpperCase() === 'NGN';

    if (isNGN) {
      return [
        {
          id: 'small',
          amount: 500,
          label: 'Cup of Coffee',
          currency: 'NGN',
          description: 'Support our server costs',
        },
        {
          id: 'medium',
          amount: 2000,
          label: 'Lunch',
          currency: 'NGN',
          description: 'Help us develop new features',
        },
        {
          id: 'large',
          amount: 5000,
          label: 'Dinner',
          currency: 'NGN',
          description: 'Major support to sustainability',
        },
      ];
    }

    return [
      {
        id: 'small',
        amount: 2,
        label: 'Cup of Coffee',
        currency: 'USD',
        description: 'Support our server costs',
      },
      {
        id: 'medium',
        amount: 5,
        label: 'Lunch',
        currency: 'USD',
        description: 'Help us develop new features',
      },
      {
        id: 'large',
        amount: 15,
        label: 'Dinner',
        currency: 'USD',
        description: 'Major support to sustainability',
      },
    ];
  }

  async updateStatus(id: string, status: SupportStatus, paymentRef?: string) {
    const support = await this.prisma.support.update({
      where: { id },
      data: {
        status,
        paymentRef,
      },
    });

    if (status === SupportStatus.SUCCESSFUL && support.supporterId) {
      await this.prisma.user.update({
        where: { id: support.supporterId },
        data: { isSupporter: true },
      });
    }

    return support;
  }
}
