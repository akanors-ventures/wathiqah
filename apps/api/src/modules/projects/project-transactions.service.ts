import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogProjectTransactionInput } from './dto/log-project-transaction.input';
import {
  ProjectTransactionType,
  WitnessStatus,
  Witness,
  Prisma,
} from '../../generated/prisma/client';
import { NotificationService } from '../notifications/notification.service';
import { v4 as uuidv4 } from 'uuid';
import { normalizeEmail } from '../../common/utils/string.utils';
import { WitnessInviteInput } from '../witnesses/dto/witness-invite.input';

export interface WitnessNotification {
  witnessId: string;
  email: string;
  firstName: string;
  rawToken: string;
  senderId: string;
  phoneNumber?: string;
  transactionDetails: {
    creatorName: string;
    projectName: string;
    amount: string;
    currency: string;
    category?: string;
    type: string;
    description?: string;
  };
}

@Injectable()
export class ProjectTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  private async processWitnesses(
    projectTransactionId: string,
    witnessUserIds: string[] | undefined,
    witnessInvites: WitnessInviteInput[] | undefined,
    prisma: Prisma.TransactionClient,
  ): Promise<WitnessNotification[]> {
    const notifications: WitnessNotification[] = [];

    // Fetch transaction details for the notification
    const transaction = await prisma.projectTransaction.findUnique({
      where: { id: projectTransactionId },
      include: {
        project: {
          include: {
            user: true, // Creator
          },
        },
      },
    });

    if (!transaction) return notifications;

    const creatorName = `${transaction.project.user.firstName} ${transaction.project.user.lastName}`;
    const projectName = transaction.project.name;

    const transactionDetails = {
      creatorName,
      projectName,
      amount: transaction.amount.toString(),
      currency: transaction.project.currency,
      category: transaction.category || undefined,
      type: transaction.type,
      description: transaction.description || undefined,
    };

    // Handle existing users as witnesses
    if (witnessUserIds && witnessUserIds.length > 0) {
      const witnessDetails: (Witness & {
        user: {
          email: string;
          firstName: string;
          lastName: string;
          phoneNumber: string | null;
        };
      })[] = [];

      for (const witnessUserId of witnessUserIds) {
        // Use upsert to handle duplicates and get the witness record
        const witness = await prisma.witness.upsert({
          where: {
            projectTransactionId_userId: {
              projectTransactionId,
              userId: witnessUserId,
            },
          },
          update: {}, // No updates needed if it exists
          create: {
            projectTransactionId,
            userId: witnessUserId,
            status: WitnessStatus.PENDING,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        });

        witnessDetails.push(
          witness as Witness & {
            user: {
              email: string;
              firstName: string;
              lastName: string;
              phoneNumber: string | null;
            };
          },
        );
      }

      for (const witness of witnessDetails) {
        const rawToken = uuidv4();

        notifications.push({
          witnessId: witness.id,
          email: witness.user.email,
          firstName: witness.user.firstName,
          rawToken,
          senderId: transaction.project.userId,
          phoneNumber: witness.user.phoneNumber || undefined,
          transactionDetails,
        });
      }
    }

    // Handle new user invites
    if (witnessInvites && witnessInvites.length > 0) {
      for (const invite of witnessInvites) {
        const normalizedEmail = normalizeEmail(invite.email);
        const { firstName, lastName } = invite.name
          ? {
              firstName: invite.name.split(' ')[0],
              lastName: invite.name.split(' ').slice(1).join(' ') || '',
            }
          : { firstName: 'Guest', lastName: '' };

        // Check if user already exists
        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          // Create new user (placeholder/invited user)
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              firstName,
              lastName,
              phoneNumber: invite.phoneNumber,
              passwordHash: null,
            },
          });
        }

        // Create witness record
        const witness = await prisma.witness.create({
          data: {
            projectTransactionId,
            userId: user.id,
            status: WitnessStatus.PENDING,
          },
        });

        const rawToken = uuidv4();
        const targetName = firstName || user.firstName;

        notifications.push({
          witnessId: witness.id,
          email: user.email,
          firstName: targetName,
          rawToken,
          senderId: transaction.project.userId,
          phoneNumber: invite.phoneNumber || user.phoneNumber || undefined,
          transactionDetails,
        });
      }
    }

    return notifications;
  }

  async create(userId: string, input: LogProjectTransactionInput) {
    const { projectId, amount, type, witnessUserIds, witnessInvites, ...rest } =
      input;

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
    let notifications: WitnessNotification[] = [];
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Create the transaction
      const transaction = await tx.projectTransaction.create({
        data: {
          projectId,
          amount,
          type,
          ...rest,
        },
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

      // Process witnesses
      notifications = await this.processWitnesses(
        transaction.id,
        witnessUserIds,
        witnessInvites,
        tx as Prisma.TransactionClient,
      );

      return transaction;
    });

    // Send notifications after transaction commits
    if (notifications.length > 0) {
      for (const notification of notifications) {
        this.notificationService
          .sendProjectTransactionWitnessInvite(
            notification.email,
            notification.firstName,
            notification.rawToken,
            {
              ...notification.transactionDetails,
              currency: notification.transactionDetails.currency,
            },
            notification.senderId,
            notification.phoneNumber,
          )
          .catch((err) =>
            console.error('Failed to send witness notification', err),
          );
      }
    }

    return transaction;
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
      include: {
        witnesses: {
          include: {
            user: true,
          },
        },
      },
    });
  }
}
