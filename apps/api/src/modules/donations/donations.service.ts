import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDonationInput } from './dto/create-donation.input';
import { DonationStatus } from '../../generated/prisma/client';

@Injectable()
export class DonationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDonationInput: CreateDonationInput, userId?: string) {
    const donation = await this.prisma.donation.create({
      data: {
        amount: createDonationInput.amount,
        currency: createDonationInput.currency,
        paymentProvider: createDonationInput.paymentProvider,
        donorName: createDonationInput.donorName,
        donorEmail: createDonationInput.donorEmail,
        message: createDonationInput.message,
        isAnonymous: createDonationInput.isAnonymous,
        donorId: userId,
        status: DonationStatus.PENDING,
      },
    });

    // In a real scenario, we would integrate with a payment provider here
    // For now, we return the pending donation record
    return donation;
  }

  async findAll() {
    return this.prisma.donation.findMany({
      where: { status: DonationStatus.SUCCESSFUL },
      orderBy: { createdAt: 'desc' },
      include: { donor: true },
    });
  }

  async findByDonor(userId: string) {
    return this.prisma.donation.findMany({
      where: { donorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.donation.findUnique({
      where: { id },
      include: { donor: true },
    });
  }

  getDonationOptions() {
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

  async updateStatus(id: string, status: DonationStatus, paymentRef?: string) {
    const donation = await this.prisma.donation.update({
      where: { id },
      data: {
        status,
        paymentRef,
      },
    });

    if (status === DonationStatus.SUCCESSFUL && donation.donorId) {
      await this.prisma.user.update({
        where: { id: donation.donorId },
        data: { isDonated: true },
      });
    }

    return donation;
  }
}
