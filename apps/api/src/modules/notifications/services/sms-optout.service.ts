import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OptOutSource } from '../../../generated/prisma/client';

@Injectable()
export class SmsOptOutService {
  constructor(private readonly prisma: PrismaService) {}

  async isOptedOut(phoneNumber: string): Promise<boolean> {
    const record = await this.prisma.smsOptOut.findUnique({
      where: { phoneNumber },
    });
    return record !== null;
  }

  async addOptOut(phoneNumber: string, source: OptOutSource): Promise<void> {
    await this.prisma.smsOptOut.upsert({
      where: { phoneNumber },
      create: { phoneNumber, source },
      update: { source },
    });
  }
}
