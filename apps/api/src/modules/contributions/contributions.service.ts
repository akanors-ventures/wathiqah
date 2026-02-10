import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContributionInput } from './dto/create-contribution.input';
import { ContributionStatus } from '../../generated/prisma/client';

@Injectable()
export class ContributionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createContributionInput: CreateContributionInput,
    userId?: string,
  ) {
    const contribution = await this.prisma.contribution.create({
      data: {
        amount: createContributionInput.amount,
        currency: createContributionInput.currency,
        paymentProvider: createContributionInput.paymentProvider,
        donorName: createContributionInput.donorName,
        donorEmail: createContributionInput.donorEmail,
        message: createContributionInput.message,
        isAnonymous: createContributionInput.isAnonymous,
        donorId: userId,
        status: ContributionStatus.PENDING,
      },
    });

    return contribution;
  }

  async findAll() {
    return this.prisma.contribution.findMany({
      where: { status: ContributionStatus.SUCCESSFUL },
      orderBy: { createdAt: 'desc' },
      include: { donor: true },
    });
  }

  async findByDonor(userId: string) {
    return this.prisma.contribution.findMany({
      where: { donorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.contribution.findUnique({
      where: { id },
      include: { donor: true },
    });
  }

  getContributionOptions(currency: string = 'USD') {
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
          description: 'Major contribution to sustainability',
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
        description: 'Major contribution to sustainability',
      },
    ];
  }

  async updateStatus(
    id: string,
    status: ContributionStatus,
    paymentRef?: string,
  ) {
    const contribution = await this.prisma.contribution.update({
      where: { id },
      data: {
        status,
        paymentRef,
      },
    });

    if (status === ContributionStatus.SUCCESSFUL && contribution.donorId) {
      await this.prisma.user.update({
        where: { id: contribution.donorId },
        data: { isContributor: true },
      });
    }

    return contribution;
  }
}
