import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { AddWitnessInput } from './dto/add-witness.input';
import { UpdateTransactionInput } from './dto/update-transaction.input';
import {
  AssetCategory,
  WitnessStatus,
  TransactionStatus,
  TransactionType,
  Prisma,
  Witness,
  ProjectTransactionType,
} from '../../generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hashToken } from '../../common/utils/crypto.utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import * as ms from 'ms';
import { WitnessInviteInput } from '../witnesses/dto/witness-invite.input';
import { NotificationService } from '../notifications/notification.service';
import { normalizeEmail, splitName } from '../../common/utils/string.utils';
import { FilterTransactionInput } from './dto/filter-transaction.input';
import { FilterSharedHistoryInput } from './dto/filter-shared-history.input';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';

/** Perspective-flip pairs for shared-ledger view. */
const PERSPECTIVE_FLIP_MAP: Partial<Record<string, string>> = {
  LOAN_GIVEN: 'LOAN_RECEIVED',
  LOAN_RECEIVED: 'LOAN_GIVEN',
  REPAYMENT_MADE: 'REPAYMENT_RECEIVED',
  REPAYMENT_RECEIVED: 'REPAYMENT_MADE',
  GIFT_GIVEN: 'GIFT_RECEIVED',
  GIFT_RECEIVED: 'GIFT_GIVEN',
  ADVANCE_PAID: 'ADVANCE_RECEIVED',
  ADVANCE_RECEIVED: 'ADVANCE_PAID',
  DEPOSIT_PAID: 'DEPOSIT_RECEIVED',
  DEPOSIT_RECEIVED: 'DEPOSIT_PAID',
  ESCROWED: 'REMITTED',
  REMITTED: 'ESCROWED',
};

function computeNetBalance(summary: TransactionSummary): number {
  return (
    summary.totalLoanReceived -
    summary.totalLoanGiven +
    summary.totalRepaymentReceived -
    summary.totalRepaymentMade +
    summary.totalGiftReceived -
    summary.totalGiftGiven +
    summary.totalAdvanceReceived -
    summary.totalAdvancePaid +
    summary.totalDepositReceived -
    summary.totalDepositPaid +
    summary.totalEscrowed -
    summary.totalRemitted
  );
}

export interface WitnessNotification {
  witnessId: string;
  email: string;
  firstName: string;
  rawToken: string;
  senderId: string;
  phoneNumber?: string;
  transactionDetails: {
    creatorName: string;
    contactName: string;
    amount: string;
    itemName?: string;
    currency?: string;
    category: AssetCategory;
    type: TransactionType;
  };
}

export interface TransactionSummary {
  totalLoanGiven: number;
  totalLoanReceived: number;
  totalRepaymentMade: number;
  totalRepaymentReceived: number;
  totalGiftGiven: number;
  totalGiftReceived: number;
  totalAdvancePaid: number;
  totalAdvanceReceived: number;
  totalDepositPaid: number;
  totalDepositReceived: number;
  totalEscrowed: number;
  totalRemitted: number;
  netBalance?: number;
  currency: string;
}

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly notificationService: NotificationService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  private async processWitnesses(
    transactionId: string,
    witnessUserIds: string[] | undefined,
    witnessInvites: WitnessInviteInput[] | undefined,
    prisma: Prisma.TransactionClient,
  ): Promise<WitnessNotification[]> {
    const notifications: WitnessNotification[] = [];

    // Fetch transaction details for the notification
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        createdBy: true,
        contact: true,
      },
    });

    if (!transaction) return notifications;

    const creatorName = `${transaction.createdBy.firstName} ${transaction.createdBy.lastName}`;
    const contactName = transaction.contact
      ? `${transaction.contact.firstName} ${transaction.contact.lastName}`
      : 'N/A';

    const transactionDetails = {
      creatorName,
      contactName,
      amount: transaction.amount?.toString(),
      itemName: transaction.itemName,
      currency: transaction.currency,
      description: transaction.description || undefined,
      date: transaction.date
        ? new Intl.DateTimeFormat('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }).format(new Date(transaction.date))
        : undefined,
      quantity: transaction.quantity ? String(transaction.quantity) : undefined,
      category: transaction.category,
      type: transaction.type,
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
            transactionId_userId: {
              transactionId,
              userId: witnessUserId,
            },
          },
          update: {}, // No updates needed if it exists
          create: {
            transactionId,
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
          senderId: transaction.createdById,
          phoneNumber: witness.user.phoneNumber || undefined,
          transactionDetails,
        });
      }
    }

    // Handle new user invites
    if (witnessInvites && witnessInvites.length > 0) {
      for (const invite of witnessInvites) {
        const normalizedEmail = normalizeEmail(invite.email);
        // Check if user already exists by email
        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        // If not, create a placeholder user
        if (!user) {
          const { firstName, lastName } = splitName(invite.name);
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              firstName,
              lastName,
              phoneNumber: invite.phoneNumber,
              passwordHash: null, // Indicates invited user
            },
          });
        }

        // Check if witness record already exists
        const existingWitness = await prisma.witness.findUnique({
          where: {
            transactionId_userId: {
              transactionId,
              userId: user.id,
            },
          },
        });

        let witnessId: string;
        if (!existingWitness) {
          // Create witness record WITHOUT invite token first (we'll store it in Redis)
          const newWitness = await prisma.witness.create({
            data: {
              transactionId,
              userId: user.id,
              status: WitnessStatus.PENDING,
            },
          });
          witnessId = newWitness.id;
        } else {
          witnessId = existingWitness.id;
        }

        const rawToken = uuidv4();

        const targetEmail = normalizedEmail || user.email;
        const { firstName } = splitName(invite.name);
        const targetName = firstName || user.firstName;

        notifications.push({
          witnessId,
          email: targetEmail,
          firstName: targetName,
          rawToken,
          senderId: transaction.createdById,
          phoneNumber: invite.phoneNumber || user.phoneNumber || undefined,
          transactionDetails,
        });
      }
    }

    return notifications;
  }

  private async notifyWitnesses(notifications: WitnessNotification[]) {
    for (const notification of notifications) {
      const {
        witnessId,
        email,
        firstName,
        rawToken,
        senderId,
        phoneNumber,
        transactionDetails,
      } = notification;
      const hashedToken = hashToken(rawToken);

      // Store in Redis: `invite:${hashedToken}` -> `witnessId`
      await this.cacheManager.set(
        `invite:${hashedToken}`,
        witnessId,
        ms(
          this.configService.getOrThrow<string>(
            'auth.inviteTokenExpiry',
          ) as ms.StringValue,
        ),
      );

      // Send notification
      await this.notificationService.sendTransactionWitnessInvite(
        email,
        firstName,
        rawToken,
        transactionDetails,
        senderId,
        phoneNumber,
      );
    }
  }

  async create(createTransactionInput: CreateTransactionInput, userId: string) {
    const {
      category,
      amount,
      itemName,
      quantity,
      witnessUserIds,
      witnessInvites,
      ...rest
    } = createTransactionInput;

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

    const isRepayment =
      rest.type === 'REPAYMENT_MADE' || rest.type === 'REPAYMENT_RECEIVED';
    const isGiftConversion =
      rest.type === 'GIFT_GIVEN' || rest.type === 'GIFT_RECEIVED';

    // Start a transaction to ensure all witness records are created or nothing is
    let notifications: WitnessNotification[] = [];
    const transaction = await this.prisma.$transaction(async (prisma) => {
      let parentTransaction: Awaited<
        ReturnType<typeof prisma.transaction.findUnique>
      > = null;
      let derivedContactId: string | undefined;

      if (rest.parentId) {
        parentTransaction = await prisma.transaction.findUnique({
          where: { id: rest.parentId },
        });

        if (!parentTransaction) {
          throw new NotFoundException(
            `Parent transaction ${rest.parentId} not found`,
          );
        }

        if (parentTransaction.createdById !== userId) {
          throw new ForbiddenException(
            'Cannot link to a transaction you do not own',
          );
        }

        if (isGiftConversion) {
          // Gift conversion must attach to an open loan
          if (
            parentTransaction.type !== 'LOAN_GIVEN' &&
            parentTransaction.type !== 'LOAN_RECEIVED'
          ) {
            throw new BadRequestException(
              'Only LOAN_GIVEN or LOAN_RECEIVED transactions can be converted to a gift',
            );
          }
          if (
            amount &&
            parentTransaction.amount &&
            Number(amount) > Number(parentTransaction.amount)
          ) {
            throw new BadRequestException(
              'Gift conversion amount cannot exceed parent transaction amount',
            );
          }
        } else if (isRepayment) {
          // Repayment must be linked to a matching loan
          const expectedParentType =
            rest.type === 'REPAYMENT_RECEIVED' ? 'LOAN_GIVEN' : 'LOAN_RECEIVED';
          if (parentTransaction.type !== expectedParentType) {
            throw new BadRequestException(
              `${rest.type} must be linked to a ${expectedParentType} transaction`,
            );
          }
          if (parentTransaction.category !== AssetCategory.FUNDS) {
            throw new BadRequestException(
              'Repayments can only be recorded against FUNDS loans',
            );
          }
          if (!parentTransaction.contactId) {
            throw new BadRequestException(
              'Parent loan must have a contact to record a repayment',
            );
          }

          // Derive contactId/currency from parent (ignore any client-supplied values)
          derivedContactId = parentTransaction.contactId;
          rest.contactId = parentTransaction.contactId;
          rest.currency =
            parentTransaction.currency ?? rest.currency ?? undefined;

          // Outstanding = parent amount - (sum of existing repayment children + sum of gift conversions)
          const children = await prisma.transaction.findMany({
            where: {
              parentId: rest.parentId,
              status: { not: 'CANCELLED' },
            },
            select: { amount: true, type: true },
          });
          const alreadySettled = children.reduce(
            (sum, child) => sum + (child.amount ? Number(child.amount) : 0),
            0,
          );
          const parentAmount = parentTransaction.amount
            ? Number(parentTransaction.amount)
            : 0;
          const outstanding = Math.max(0, parentAmount - alreadySettled);
          const repayAmount = Number(amount ?? 0);

          if (repayAmount <= 0) {
            throw new BadRequestException(
              'Repayment amount must be greater than zero',
            );
          }
          if (repayAmount > outstanding) {
            throw new BadRequestException(
              `Repayment amount (${repayAmount}) exceeds outstanding balance (${outstanding}) on the parent loan`,
            );
          }
        } else {
          // Parent linkage is only supported for gifts and repayments
          throw new BadRequestException(
            'parentId is only valid for gift conversions or repayments',
          );
        }
      } else if (isRepayment) {
        throw new BadRequestException(
          'Repayments must be linked to a parent loan via parentId',
        );
      }

      // Validate contactId if provided (skipped when derived from parent above)
      if (rest.contactId && !derivedContactId) {
        const contact = await prisma.contact.findUnique({
          where: { id: rest.contactId },
        });

        if (!contact) {
          throw new NotFoundException(`Contact ${rest.contactId} not found`);
        }

        if (contact.userId !== userId) {
          throw new ForbiddenException(
            'Cannot create a transaction for a contact you do not own',
          );
        }
      }

      const transaction = await prisma.transaction.create({
        data: {
          category,
          amount: category === AssetCategory.FUNDS ? amount : null,
          itemName: category === AssetCategory.ITEM ? itemName : null,
          quantity: category === AssetCategory.ITEM ? quantity : null,
          createdById: userId,
          ...rest,
        },
      });

      // Log parent-history entry for conversions and repayments
      if (rest.parentId && parentTransaction) {
        const parentAmountNum = parentTransaction.amount
          ? Number(parentTransaction.amount)
          : 0;
        const thisAmountNum = Number(amount ?? 0);
        await prisma.transactionHistory.create({
          data: {
            transactionId: rest.parentId,
            userId,
            changeType: isRepayment
              ? 'REPAYMENT_RECORDED'
              : 'PARTIAL_CONVERSION_TO_GIFT',
            previousState: {
              amount: parentTransaction.amount,
              type: parentTransaction.type,
            },
            newState: isRepayment
              ? {
                  repaymentId: transaction.id,
                  repaymentAmount: amount,
                  repaymentType: rest.type,
                }
              : {
                  conversionId: transaction.id,
                  giftAmount: amount,
                  remainingAmount: parentAmountNum - thisAmountNum,
                },
          },
        });
      }

      notifications = await this.processWitnesses(
        transaction.id,
        witnessUserIds,
        witnessInvites,
        prisma,
      );

      return transaction;
    });

    // Send notifications after transaction commits
    if (notifications.length > 0) {
      await this.notifyWitnesses(notifications).catch((err) => {
        console.error('Failed to send witness notifications:', err);
      });
    }

    return transaction;
  }

  async addWitness(addWitnessInput: AddWitnessInput, userId: string) {
    const { transactionId, witnessUserIds, witnessInvites } = addWitnessInput;

    const transaction = await this.findOne(transactionId, userId);

    let notifications: WitnessNotification[] = [];
    const updatedTransaction = await this.prisma.$transaction(
      async (prisma) => {
        notifications = await this.processWitnesses(
          transaction.id,
          witnessUserIds,
          witnessInvites,
          prisma,
        );

        // Return updated transaction with witnesses
        return prisma.transaction.findUnique({
          where: { id: transactionId },
          include: {
            witnesses: {
              include: {
                user: true,
              },
            },
          },
        });
      },
    );

    // Send notifications after transaction commits
    if (notifications.length > 0) {
      await this.notifyWitnesses(notifications).catch((err) => {
        console.error('Failed to send witness notifications:', err);
      });
    }

    return updatedTransaction;
  }

  private flipStatePerspective(state: Record<string, unknown> | null) {
    if (!state) return null;
    const flipped = { ...state };
    if (typeof state.type === 'string' && PERSPECTIVE_FLIP_MAP[state.type]) {
      flipped.type = PERSPECTIVE_FLIP_MAP[state.type];
    }
    return flipped;
  }

  private applyPerspective<
    T extends {
      createdById: string;
      type: TransactionType;
      history?: {
        previousState: unknown;
        newState: unknown;
      }[];
      createdBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        isSupporter: boolean;
      } | null;
      contact?: unknown;
    },
  >(transaction: T, userId: string): T {
    if (transaction.createdById === userId) return transaction;

    // Flip perspective for the contact
    const transformed = { ...transaction };

    // If we have creator info, use it as the contact for the viewer
    if (transaction.createdBy) {
      // Create a virtual contact from the creator
      const creator = transaction.createdBy;
      const virtualContact = {
        id: creator.id, // Using creator's user ID as contact ID
        firstName: creator.firstName,
        lastName: creator.lastName,
        name: `${creator.firstName} ${creator.lastName}`,
        email: creator.email,
        isSupporter: creator.isSupporter,
        linkedUserId: creator.id,
        userId: userId, // The viewer "owns" this virtual contact view
        isOnPlatform: true,
      };

      // We need to cast this because we're modifying the structure potentially
      transformed.contact = virtualContact;
    }

    if (PERSPECTIVE_FLIP_MAP[transaction.type]) {
      transformed.type = PERSPECTIVE_FLIP_MAP[
        transaction.type
      ] as TransactionType;
    }

    // Flip history entries if present
    if (transformed.history && Array.isArray(transformed.history)) {
      transformed.history = transformed.history.map((h) => ({
        ...h,
        previousState: this.flipStatePerspective(
          h.previousState as Record<string, unknown>,
        ),
        newState: this.flipStatePerspective(
          h.newState as Record<string, unknown>,
        ),
      }));
    }

    return transformed;
  }

  async findAll(userId: string, filter?: FilterTransactionInput) {
    const where: Prisma.TransactionWhereInput = {
      OR: [{ createdById: userId }, { contact: { linkedUserId: userId } }],
      status: { not: TransactionStatus.CANCELLED },
    };

    if (filter) {
      if (filter.contactId) {
        const contact = await this.prisma.contact.findUnique({
          where: { id: filter.contactId },
        });

        if (contact?.linkedUserId) {
          // If we're filtering by a contact who is also a user,
          // we want transactions we created with them OR transactions they created with us
          where.OR = [
            { createdById: userId, contactId: filter.contactId },
            {
              createdById: contact.linkedUserId,
              contact: { linkedUserId: userId },
            },
          ];
        } else {
          // Regular contact, only transactions we created
          delete where.OR;
          where.createdById = userId;
          where.contactId = filter.contactId;
        }
      }

      if (filter.types && filter.types.length > 0) {
        where.type = { in: filter.types };
      }
      if (filter.status) {
        where.status = filter.status;
      }
      if (filter.currency) {
        where.currency = filter.currency;
      }
      if (filter.startDate || filter.endDate) {
        where.date = {
          ...(filter.startDate && { gte: filter.startDate }),
          ...(filter.endDate && { lte: filter.endDate }),
        };
      }
      if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
        where.amount = {
          ...(filter.minAmount !== undefined && { gte: filter.minAmount }),
          ...(filter.maxAmount !== undefined && { lte: filter.maxAmount }),
        };
      }
      if (filter.search) {
        const searchFilter = {
          OR: [
            { description: { contains: filter.search, mode: 'insensitive' } },
            { itemName: { contains: filter.search, mode: 'insensitive' } },
            {
              contact: {
                OR: [
                  {
                    firstName: { contains: filter.search, mode: 'insensitive' },
                  },
                  {
                    lastName: { contains: filter.search, mode: 'insensitive' },
                  },
                ],
              },
            },
          ],
        };

        // Combine search with existing where
        const existingWhere = { ...where };
        delete where.OR;
        delete where.createdById;
        delete where.contactId;

        where.AND = [
          existingWhere,
          searchFilter as Prisma.TransactionWhereInput,
        ];
      }
    }

    // Default to excluding cancelled transactions from general list
    if (!where.status) {
      where.status = { not: TransactionStatus.CANCELLED };
    }

    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 25;
    const skip = (page - 1) * limit;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include: {
          contact: true,
          createdBy: true,
          witnesses: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    const transformedItems = items.map((item) =>
      this.applyPerspective(item, userId),
    );

    // Fetch and map project transactions (skip when filtering by a specific
    // contact — project transactions belong to projects, not contacts).
    const projects = filter?.contactId
      ? []
      : await this.prisma.project.findMany({
          where: { userId },
          select: { id: true },
        });

    const projectWhere: Prisma.ProjectTransactionWhereInput = {
      projectId: { in: projects.map((p) => p.id) },
    };

    if (where.date) {
      projectWhere.date = where.date as Prisma.DateTimeFilter;
    }
    if (where.amount) {
      projectWhere.amount = where.amount as Prisma.DecimalFilter;
    }
    if (filter?.search) {
      projectWhere.OR = [
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const projectTransactions = await this.prisma.projectTransaction.findMany({
      where: projectWhere,
      include: {
        project: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const mappedProjectTransactions = projectTransactions.map((pt) => ({
      id: pt.id,
      amount: Number(pt.amount),
      type:
        pt.type === ProjectTransactionType.INCOME
          ? TransactionType.INCOME
          : TransactionType.EXPENSE,
      category: AssetCategory.FUNDS,
      status: TransactionStatus.COMPLETED,
      currency: pt.project.currency,
      date: pt.date,
      description: pt.description || '',
      createdAt: pt.createdAt,
      createdById: pt.project.userId,
      createdBy: {
        ...pt.project.user,
        // `name` is a @ResolveField on UsersResolver; compute it explicitly here
        // so callers that read createdBy.name get the correct full name.
        name: `${pt.project.user.firstName ?? ''} ${pt.project.user.lastName ?? ''}`.trim(),
      },
      contactId: pt.projectId,
      contact: {
        id: pt.projectId,
        name: pt.project.name,
        isSupporter: false,
      },
      witnesses: [],
      itemName: null,
      quantity: null,
      parentId: null,
      parent: null,
      conversions: [],
    }));

    // Combine and sort
    const combinedItems = [
      ...transformedItems,
      ...mappedProjectTransactions,
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    // Determine target currency for summary
    let targetCurrency = filter?.summaryCurrency || filter?.currency;
    if (!targetCurrency) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { preferredCurrency: true },
      });
      targetCurrency = user?.preferredCurrency || 'NGN';
    }

    const summary = await this.calculateConvertedSummary(
      userId,
      where,
      targetCurrency,
    );

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: combinedItems as any,
      summary,
      total,
      page,
      limit,
    };
  }

  private async calculateConvertedSummary(
    userId: string,
    where: Prisma.TransactionWhereInput,
    targetCurrency: string,
  ) {
    // 1. Aggregations for transactions created by the user
    const ownAggregations = await this.prisma.transaction.groupBy({
      by: ['type', 'currency'],
      where: { ...where, createdById: userId },
      _sum: {
        amount: true,
      },
    });

    // 2. Aggregations for transactions where user is the contact (flip required)
    const contactAggregations = await this.prisma.transaction.groupBy({
      by: ['type', 'currency'],
      where: {
        ...where,
        createdById: { not: userId },
        contact: { linkedUserId: userId },
      },
      _sum: {
        amount: true,
      },
    });

    const summary: TransactionSummary = {
      totalLoanGiven: 0,
      totalLoanReceived: 0,
      totalRepaymentMade: 0,
      totalRepaymentReceived: 0,
      totalGiftGiven: 0,
      totalGiftReceived: 0,
      totalAdvancePaid: 0,
      totalAdvanceReceived: 0,
      totalDepositPaid: 0,
      totalDepositReceived: 0,
      totalEscrowed: 0,
      totalRemitted: 0,
      netBalance: 0,
      currency: targetCurrency,
    };

    // Process own transactions
    for (const agg of ownAggregations) {
      const amount = Number(agg._sum.amount) || 0;
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      this.updateSummaryWithTransaction(summary, agg.type, convertedAmount);
    }

    // Process contact transactions (with flip)
    for (const agg of contactAggregations) {
      const amount = Number(agg._sum.amount) || 0;
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      const flippedType = (PERSPECTIVE_FLIP_MAP[agg.type] ??
        agg.type) as TransactionType;
      this.updateSummaryWithTransaction(summary, flippedType, convertedAmount);
    }

    summary.netBalance = computeNetBalance(summary);

    return summary;
  }

  private updateSummaryWithTransaction(
    summary: TransactionSummary,
    type: TransactionType,
    amount: number,
  ) {
    const fieldMap: Partial<Record<string, keyof TransactionSummary>> = {
      LOAN_GIVEN: 'totalLoanGiven',
      LOAN_RECEIVED: 'totalLoanReceived',
      REPAYMENT_MADE: 'totalRepaymentMade',
      REPAYMENT_RECEIVED: 'totalRepaymentReceived',
      GIFT_GIVEN: 'totalGiftGiven',
      GIFT_RECEIVED: 'totalGiftReceived',
      ADVANCE_PAID: 'totalAdvancePaid',
      ADVANCE_RECEIVED: 'totalAdvanceReceived',
      DEPOSIT_PAID: 'totalDepositPaid',
      DEPOSIT_RECEIVED: 'totalDepositReceived',
      ESCROWED: 'totalEscrowed',
      REMITTED: 'totalRemitted',
      // EXPENSE and INCOME deliberately omitted — legacy rows ignored in summaries
    };
    const field = fieldMap[type];
    if (field) (summary[field] as number) += amount;
  }

  async groupByContact(userId: string, filter?: FilterTransactionInput) {
    const baseWhere: Prisma.TransactionWhereInput = {
      status: { not: TransactionStatus.CANCELLED },
    };

    if (filter?.types && filter.types.length > 0) {
      baseWhere.type = { in: filter.types };
    }
    if (filter?.startDate || filter?.endDate) {
      baseWhere.date = {
        ...(filter.startDate && { gte: filter.startDate }),
        ...(filter.endDate && { lte: filter.endDate }),
      };
    }
    if (filter?.minAmount !== undefined || filter?.maxAmount !== undefined) {
      baseWhere.amount = {
        ...(filter.minAmount !== undefined && { gte: filter.minAmount }),
        ...(filter.maxAmount !== undefined && { lte: filter.maxAmount }),
      };
    }
    if (filter?.search) {
      baseWhere.OR = [
        { description: { contains: filter.search, mode: 'insensitive' } },
        { itemName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Determine target currency for summary
    let targetCurrency = filter?.summaryCurrency || filter?.currency;
    if (!targetCurrency) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { preferredCurrency: true },
      });
      targetCurrency = user?.preferredCurrency || 'NGN';
    }

    // 1. Aggregations for transactions created by the user
    const ownAggregations = await this.prisma.transaction.groupBy({
      by: ['contactId', 'type', 'currency'],
      where: {
        ...baseWhere,
        createdById: userId,
        contactId: filter?.contactId || undefined,
      },
      _sum: {
        amount: true,
      },
    });

    // 2. Aggregations for transactions where user is the contact (flip required)
    const sharedAggregations = await this.prisma.transaction.groupBy({
      by: ['createdById', 'type', 'currency'],
      where: {
        ...baseWhere,
        createdById: { not: userId },
        contact: { linkedUserId: userId },
      },
      _sum: {
        amount: true,
      },
    });

    // Get all contacts for this user to map names
    const contacts = await this.prisma.contact.findMany({
      where: { userId },
    });

    const contactMap = new Map(contacts.map((c) => [c.id, c]));
    // Map linkedUserId to local contactId for shared transactions
    const linkedUserContactMap = new Map(
      contacts.filter((c) => c.linkedUserId).map((c) => [c.linkedUserId, c.id]),
    );

    // Group aggregations by contactId
    const groupedByContact = new Map<string | null, TransactionSummary>();

    const getInitialSummary = (): TransactionSummary => ({
      totalLoanGiven: 0,
      totalLoanReceived: 0,
      totalRepaymentMade: 0,
      totalRepaymentReceived: 0,
      totalGiftGiven: 0,
      totalGiftReceived: 0,
      totalAdvancePaid: 0,
      totalAdvanceReceived: 0,
      totalDepositPaid: 0,
      totalDepositReceived: 0,
      totalEscrowed: 0,
      totalRemitted: 0,
      netBalance: 0,
      currency: targetCurrency,
    });

    // Process own transactions
    for (const agg of ownAggregations) {
      const contactId = agg.contactId;
      if (!groupedByContact.has(contactId)) {
        groupedByContact.set(contactId, getInitialSummary());
      }

      const summary = groupedByContact.get(contactId);
      const amount = Number(agg._sum.amount) || 0;
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      this.updateSummaryWithTransaction(summary, agg.type, convertedAmount);
    }

    // Process shared transactions (with flip)
    for (const agg of sharedAggregations) {
      // Find the local contact representing the creator
      const contactId = linkedUserContactMap.get(agg.createdById) || null;

      // If we are filtering by contactId and this shared transaction doesn't match, skip
      if (filter?.contactId && contactId !== filter.contactId) continue;

      if (!groupedByContact.has(contactId)) {
        groupedByContact.set(contactId, getInitialSummary());
      }

      const summary = groupedByContact.get(contactId);
      const amount = Number(agg._sum.amount) || 0;
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      // Flip perspective
      const flippedType = (PERSPECTIVE_FLIP_MAP[agg.type] ??
        agg.type) as TransactionType;
      this.updateSummaryWithTransaction(summary, flippedType, convertedAmount);
    }

    // Calculate net balance for each contact and format result
    const result = Array.from(groupedByContact.entries()).map(
      ([contactId, summary]) => {
        summary.netBalance = computeNetBalance(summary);

        return {
          contact: contactId ? contactMap.get(contactId) : null,
          summary,
        };
      },
    );

    return result;
  }

  async findOne(id: string, userId: string, flipPerspective = false) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        contact: true,
        createdBy: true,
        conversions: {
          orderBy: {
            date: 'desc',
          },
        },
        witnesses: {
          include: {
            user: true,
          },
        },
        history: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    const isCreator = transaction.createdById === userId;
    const isLinkedContact = transaction.contact?.linkedUserId === userId;

    if (!isCreator && !isLinkedContact) {
      throw new ForbiddenException(
        'You do not have permission to access this transaction',
      );
    }

    return flipPerspective
      ? this.applyPerspective(transaction, userId)
      : transaction;
  }

  async update(
    id: string,
    updateTransactionInput: UpdateTransactionInput,
    userId: string,
  ) {
    const transaction = await this.findOne(id, userId);

    if (transaction.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can update this transaction',
      );
    }

    // Create audit log entry
    const previousState = {
      category: transaction.category,
      amount: transaction.amount,
      currency: transaction.currency,
      itemName: transaction.itemName,
      quantity: transaction.quantity,
      type: transaction.type,
      date: transaction.date,
      description: transaction.description,
      contactId: transaction.contactId,
    };

    const {
      category,
      amount,
      currency,
      itemName,
      quantity,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      witnessUserIds, // Destructure to exclude from rest
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      witnessInvites, // Destructure to exclude from rest
      ...rest
    } = updateTransactionInput;

    // Re-validate category constraints if they are being updated
    if (category === AssetCategory.FUNDS && !amount && !transaction.amount) {
      // Note: This check is simplified; ideally check if 'amount' is in input OR exists in DB.
      // For PartialType, undefined means "do not update".
    }

    // Determine what actually changed for the history log
    const changes: Prisma.TransactionUncheckedUpdateInput = {};
    const changeDescriptions: string[] = [];

    if (category && category !== transaction.category) {
      changes.category = category;
      changeDescriptions.push(`Category changed to ${category}`);
    }
    if (
      amount &&
      Number(amount) !== Number(transaction.amount) &&
      (category === AssetCategory.FUNDS ||
        (!category && transaction.category === AssetCategory.FUNDS))
    ) {
      changes.amount = amount;
      changeDescriptions.push(`Amount changed to ${amount}`);
    }
    if (currency && currency !== transaction.currency) {
      changes.currency = currency;
      changeDescriptions.push(`Currency changed to ${currency}`);
    }
    if (
      itemName &&
      itemName !== transaction.itemName &&
      (category === AssetCategory.ITEM ||
        (!category && transaction.category === AssetCategory.ITEM))
    ) {
      changes.itemName = itemName;
      changeDescriptions.push(`Item Name changed to ${itemName}`);
    }
    if (
      quantity &&
      quantity !== transaction.quantity &&
      (category === AssetCategory.ITEM ||
        (!category && transaction.category === AssetCategory.ITEM))
    ) {
      changes.quantity = quantity;
      changeDescriptions.push(`Quantity changed to ${quantity}`);
    }
    if (rest.description && rest.description !== transaction.description) {
      changes.description = rest.description;
      changeDescriptions.push('Description updated');
    }
    if (
      rest.date &&
      new Date(rest.date).getTime() !== new Date(transaction.date).getTime()
    ) {
      changes.date = rest.date;
      changeDescriptions.push(
        `Date changed to ${new Date(rest.date).toLocaleDateString()}`,
      );
    }
    if (rest.type && rest.type !== transaction.type) {
      changes.type = rest.type;
      changeDescriptions.push(`Type changed to ${rest.type}`);
    }
    if (rest.contactId && rest.contactId !== transaction.contactId) {
      changes.contactId = rest.contactId;
      changeDescriptions.push('Contact updated');
    }

    // Validate contactId if it's being updated
    if (rest.contactId && rest.contactId !== transaction.contactId) {
      const contact = await this.prisma.contact.findUnique({
        where: { id: rest.contactId },
      });

      if (!contact) {
        throw new NotFoundException(`Contact ${rest.contactId} not found`);
      }

      if (contact.userId !== userId) {
        throw new ForbiddenException(
          'Cannot assign a transaction to a contact you do not own',
        );
      }
    }

    // Validate parentId if it's being updated
    if (rest.parentId && rest.parentId !== transaction.parentId) {
      const parent = await this.prisma.transaction.findUnique({
        where: { id: rest.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent transaction ${rest.parentId} not found`,
        );
      }

      if (parent.createdById !== userId) {
        throw new ForbiddenException(
          'Cannot link to a transaction you do not own',
        );
      }
    }

    const hasChanges = Object.keys(changes).length > 0;

    // Business Rule: Check if any witness has acknowledged
    const acknowledgedWitnesses = transaction.witnesses.filter(
      (w: { status: WitnessStatus }) => w.status === WitnessStatus.ACKNOWLEDGED,
    );
    const hasAcknowledgedWitness = acknowledgedWitnesses.length > 0;

    if (hasChanges && hasAcknowledgedWitness) {
      // Logic for post-acknowledgement update:
      // Mark witnesses as MODIFIED instead of PENDING to indicate an update occurred
      await this.prisma.witness.updateMany({
        where: { transactionId: id, status: WitnessStatus.ACKNOWLEDGED },
        data: {
          status: WitnessStatus.MODIFIED,
          acknowledgedAt: null,
        },
      });

      // Notify witnesses
      const updater = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      const updaterName = updater
        ? `${updater.firstName} ${updater.lastName}`
        : 'Transaction Owner';

      for (const witness of acknowledgedWitnesses) {
        if (witness.user && witness.user.email) {
          // Fire and forget notification
          this.notificationService
            .sendWitnessUpdateNotification(
              witness.user.email,
              witness.user.firstName || 'Witness',
              updaterName,
              changeDescriptions,
              id,
            )
            .catch((err) =>
              console.error(
                `Failed to send witness update notification to ${witness.user.email}`,
                err,
              ),
            );
        }
      }
    }

    const updatedTransaction = await this.prisma.$transaction(
      async (prisma) => {
        const updated = await prisma.transaction.update({
          where: { id },
          data: {
            ...(category && { category }),
            amount:
              category === AssetCategory.FUNDS
                ? amount
                : category === AssetCategory.ITEM
                  ? null
                  : amount,
            itemName:
              category === AssetCategory.ITEM
                ? itemName
                : category === AssetCategory.FUNDS
                  ? null
                  : itemName,
            quantity:
              category === AssetCategory.ITEM
                ? quantity
                : category === AssetCategory.FUNDS
                  ? null
                  : quantity,
            ...rest,
          },
        });

        await prisma.transactionHistory.create({
          data: {
            transactionId: id,
            userId,
            changeType: hasAcknowledgedWitness ? 'UPDATE_POST_ACK' : 'UPDATE',
            previousState: previousState as Prisma.InputJsonValue,
            newState: changes as Prisma.InputJsonValue,
          },
        });

        if (witnessUserIds || witnessInvites) {
          await this.processWitnesses(
            id,
            witnessUserIds,
            witnessInvites,
            prisma as Prisma.TransactionClient,
          );
        }

        return updated;
      },
    );

    return updatedTransaction;
  }

  async remove(id: string, userId: string) {
    const transaction = await this.findOne(id, userId);

    if (transaction.createdById !== userId) {
      throw new ForbiddenException(
        'Only the creator can remove this transaction',
      );
    }

    // If there are no witnesses, we can safely hard-delete
    if (transaction.witnesses.length === 0) {
      return this.prisma.transaction.delete({
        where: { id },
      });
    }

    // If there are witnesses, we mark as CANCELLED to preserve accountability
    // and notify witnesses.
    const [cancelledTransaction] = await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id },
        data: { status: TransactionStatus.CANCELLED },
      }),
      this.prisma.transactionHistory.create({
        data: {
          transactionId: id,
          userId,
          changeType: 'CANCELLED',
          previousState: {
            status: transaction.status,
          } as Prisma.InputJsonValue,
          newState: {
            status: TransactionStatus.CANCELLED,
          } as Prisma.InputJsonValue,
        },
      }),
    ]);

    // Notify acknowledged witnesses
    const acknowledgedWitnesses = transaction.witnesses.filter(
      (w: { status: WitnessStatus }) => w.status === WitnessStatus.ACKNOWLEDGED,
    );

    if (acknowledgedWitnesses.length > 0) {
      const owner = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      const ownerName = owner
        ? `${owner.firstName} ${owner.lastName}`
        : 'Transaction Owner';

      for (const witness of acknowledgedWitnesses) {
        if (witness.user && witness.user.email) {
          this.notificationService
            .sendWitnessUpdateNotification(
              witness.user.email,
              witness.user.firstName || 'Witness',
              ownerName,
              ['This transaction has been cancelled/voided.'],
              id,
            )
            .catch((err) =>
              console.error(
                `Failed to send cancellation notification to ${witness.user.email}`,
                err,
              ),
            );
        }
      }
    }

    return cancelledTransaction;
  }

  async findMyContactTransactions(
    userId: string,
    filter?: FilterSharedHistoryInput,
  ) {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      contact: {
        linkedUserId: userId,
      },
    };

    if (filter?.types && filter.types.length > 0) {
      where.type = { in: filter.types };
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.startDate || filter?.endDate) {
      where.date = {
        ...(filter.startDate && { gte: filter.startDate }),
        ...(filter.endDate && { lte: filter.endDate }),
      };
    }
    if (filter?.search) {
      const searchFilter: Prisma.TransactionWhereInput = {
        OR: [
          { description: { contains: filter.search, mode: 'insensitive' } },
          {
            createdBy: {
              firstName: { contains: filter.search, mode: 'insensitive' },
            },
          },
          {
            createdBy: {
              lastName: { contains: filter.search, mode: 'insensitive' },
            },
          },
        ],
      };
      const existingWhere = { ...where };
      where.AND = [existingWhere, searchFilter];
      delete where.contact;
      delete where.type;
      delete where.status;
      delete where.date;
    }

    const [total, items] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        include: {
          contact: true,
          createdBy: true,
          witnesses: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: items.map((item) => this.applyPerspective(item, userId)),
      total,
      page,
      limit,
    };
  }
}
