import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WitnessStatus } from '../../generated/prisma/client';

@Injectable()
export class WitnessesService {
  constructor(private prisma: PrismaService) {}

  async acknowledge(witnessId: string, status: WitnessStatus, userId: string) {
    const witness = await this.prisma.witness.findUnique({
      where: { id: witnessId },
    });

    if (!witness) {
      throw new NotFoundException(
        `Witness record with ID ${witnessId} not found`,
      );
    }

    if (witness.userId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to update this witness record',
      );
    }

    return this.prisma.witness.update({
      where: { id: witnessId },
      data: {
        status,
        acknowledgedAt:
          status === WitnessStatus.ACKNOWLEDGED ? new Date() : null,
      },
      include: {
        transaction: true,
        user: true,
      },
    });
  }

  async findMyRequests(userId: string, status?: WitnessStatus) {
    return this.prisma.witness.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        transaction: {
          include: {
            contact: true,
            createdBy: true,
          },
        },
        user: true,
      },
      orderBy: {
        invitedAt: 'desc',
      },
    });
  }
}
