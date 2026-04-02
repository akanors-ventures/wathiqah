import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WitnessStatus, TransactionType } from '../../generated/prisma/client';
import { FilterWitnessInput } from './dto/filter-witness.input';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { NotificationService } from '../notifications/notification.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { hashToken } from '../../common/utils/crypto.utils';
import * as ms from 'ms';

@Injectable()
export class WitnessesService {
  private readonly logger = new Logger(WitnessesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private notificationService: NotificationService,
    private configService: ConfigService,
  ) {}

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

    const result = await this.prisma.$transaction(async (prisma) => {
      const updatedWitness = await prisma.witness.update({
        where: { id: witnessId },
        data: {
          status,
          acknowledgedAt:
            status === WitnessStatus.ACKNOWLEDGED ? new Date() : null,
        },
        include: {
          transaction: {
            include: {
              createdBy: true,
              contact: true,
            },
          },
          user: true,
        },
      });

      await prisma.transactionHistory.create({
        data: {
          transactionId: updatedWitness.transactionId,
          userId,
          changeType: `WITNESS_${status}`,
          previousState: {
            witnessStatus: witness.status,
            witnessName: `${updatedWitness.user.firstName} ${updatedWitness.user.lastName}`,
          },
          newState: {
            witnessStatus: status,
            witnessName: `${updatedWitness.user.firstName} ${updatedWitness.user.lastName}`,
            transactionDetails: {
              creator: `${updatedWitness.transaction.createdBy.firstName} ${updatedWitness.transaction.createdBy.lastName}`,
              contact: updatedWitness.transaction.contact
                ? `${updatedWitness.transaction.contact.firstName} ${updatedWitness.transaction.contact.lastName}`
                : 'N/A',
              amount: updatedWitness.transaction.amount,
              currency: updatedWitness.transaction.currency,
              category: updatedWitness.transaction.category,
            },
          },
        },
      });

      return updatedWitness;
    });

    // Send contact notification on the first acknowledgment only
    if (status === WitnessStatus.ACKNOWLEDGED) {
      const { transaction } = result;
      const qualifyingTypes: TransactionType[] = [
        TransactionType.GIVEN,
        TransactionType.RECEIVED,
        TransactionType.RETURNED,
      ];

      const hasContact =
        transaction.contact &&
        (transaction.contact.phoneNumber || transaction.contact.email);

      if (qualifyingTypes.includes(transaction.type) && hasContact) {
        const previousAcknowledgements = await this.prisma.witness.count({
          where: {
            transactionId: transaction.id,
            id: { not: witnessId },
            status: WitnessStatus.ACKNOWLEDGED,
          },
        });

        if (previousAcknowledgements === 0) {
          const witnessDisplayName =
            `${result.user.firstName} ${result.user.lastName}`.trim();
          const creatorDisplayName =
            `${transaction.createdBy.firstName} ${transaction.createdBy.lastName}`.trim();

          await this.notificationService
            .sendContactNotification({
              transactionId: transaction.id,
              contactPhoneNumber: transaction.contact!.phoneNumber ?? null,
              contactEmail: transaction.contact!.email ?? null,
              contactFirstName: transaction.contact!.firstName ?? null,
              creatorId: transaction.createdById,
              creatorDisplayName,
              amount: transaction.amount?.toNumber() ?? 0,
              currency: transaction.currency,
              witnessDisplayName,
              transactionType: transaction.type,
            })
            .catch((err) => {
              this.logger.error(
                'Failed to send contact notification after witness acknowledgment',
                err,
              );
            });
        }
      }
    }

    return result;
  }

  async findMyRequests(
    userId: string,
    filter?: FilterWitnessInput,
    status?: WitnessStatus,
  ) {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: {
      userId: string;
      status?: WitnessStatus;
      invitedAt?: { gte?: Date; lte?: Date };
      OR?: unknown[];
    } = { userId };

    if (status) {
      where.status = status;
    }

    if (filter?.startDate || filter?.endDate) {
      where.invitedAt = {
        ...(filter.startDate && { gte: filter.startDate }),
        ...(filter.endDate && { lte: filter.endDate }),
      };
    }

    if (filter?.search) {
      where.OR = [
        {
          transaction: {
            description: { contains: filter.search, mode: 'insensitive' },
          },
        },
        {
          projectTransaction: {
            description: { contains: filter.search, mode: 'insensitive' },
          },
        },
        {
          transaction: {
            contact: {
              firstName: { contains: filter.search, mode: 'insensitive' },
            },
          },
        },
        {
          transaction: {
            contact: {
              lastName: { contains: filter.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const include = {
      transaction: {
        include: {
          contact: true,
          createdBy: true,
        },
      },
      user: true,
    };

    const [total, items] = await Promise.all([
      this.prisma.witness.count({ where }),
      this.prisma.witness.findMany({
        where,
        include,
        orderBy: { invitedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { items, total, page, limit };
  }

  async resendInvitation(witnessId: string, userId: string) {
    const witness = await this.prisma.witness.findUnique({
      where: { id: witnessId },
      include: {
        transaction: {
          include: {
            createdBy: true,
            contact: true,
          },
        },
        user: true,
      },
    });

    if (!witness) {
      throw new NotFoundException(
        `Witness record with ID ${witnessId} not found`,
      );
    }

    if (witness.transaction.createdById !== userId) {
      throw new ForbiddenException(
        'Only the transaction creator can resend this invitation',
      );
    }

    if (witness.status === WitnessStatus.ACKNOWLEDGED) {
      throw new BadRequestException(
        'Witness has already acknowledged this transaction',
      );
    }

    const rawToken = uuidv4();
    const hashedToken = hashToken(rawToken);

    // Store in Redis
    await this.cacheManager.set(
      `invite:${hashedToken}`,
      witnessId,
      ms(
        this.configService.getOrThrow<string>(
          'auth.inviteTokenExpiry',
        ) as ms.StringValue,
      ),
    );

    const transactionDetails = {
      creatorName: `${witness.transaction.createdBy.firstName} ${witness.transaction.createdBy.lastName}`,
      contactName: witness.transaction.contact
        ? `${witness.transaction.contact.firstName} ${witness.transaction.contact.lastName}`
        : 'N/A',
      amount: witness.transaction.amount?.toString() || '0',
      itemName: witness.transaction.itemName,
      currency: witness.transaction.currency,
      category: witness.transaction.category,
      type: witness.transaction.type,
    };

    await this.notificationService.sendTransactionWitnessInvite(
      witness.user.email,
      witness.user.firstName,
      rawToken,
      transactionDetails,
      userId,
      witness.user.phoneNumber || undefined,
    );

    // Update invitedAt timestamp
    return this.prisma.witness.update({
      where: { id: witnessId },
      data: { invitedAt: new Date() },
      include: {
        user: true,
        transaction: true,
      },
    });
  }

  async removeWitness(witnessId: string, userId: string) {
    const witness = await this.prisma.witness.findUnique({
      where: { id: witnessId },
      include: {
        transaction: {
          include: {
            witnesses: true,
          },
        },
        user: true,
      },
    });

    if (!witness) {
      throw new NotFoundException(
        `Witness record with ID ${witnessId} not found`,
      );
    }

    if (witness.transaction.createdById !== userId) {
      throw new ForbiddenException(
        'Only the transaction creator can remove this witness',
      );
    }

    if (witness.status === WitnessStatus.ACKNOWLEDGED) {
      throw new ForbiddenException(
        'Cannot remove a witness who has already acknowledged. Please cancel the transaction instead if needed.',
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      // Create history record for the removal
      await prisma.transactionHistory.create({
        data: {
          transactionId: witness.transactionId,
          userId,
          changeType: 'WITNESS_REMOVED',
          previousState: {
            witnessId: witness.id,
            witnessName: `${witness.user.firstName} ${witness.user.lastName}`,
            witnessEmail: witness.user.email,
          },
          newState: {
            action: 'REMOVED',
            reason: 'Manually removed by creator',
          },
        },
      });

      // Delete the witness record
      return prisma.witness.delete({
        where: { id: witnessId },
      });
    });
  }
}
