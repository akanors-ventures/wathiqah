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
  Prisma,
  Witness,
} from '../../generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hashToken } from '../../common/utils/crypto.utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import * as ms from 'ms';
import { WitnessInviteInput } from '../witnesses/dto/witness-invite.input';
import { NotificationService } from '../notifications/notification.service';
import { splitName } from '../../common/utils/string.utils';
import { FilterTransactionInput } from './dto/filter-transaction.input';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';

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
  ) {
    // Handle existing users as witnesses
    if (witnessUserIds && witnessUserIds.length > 0) {
      const witnesses = await prisma.witness.createManyAndReturn({
        data: witnessUserIds.map((witnessUserId) => ({
          transactionId,
          userId: witnessUserId,
          status: WitnessStatus.PENDING,
        })),
        skipDuplicates: true,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
        },
      });

      for (const witness of witnesses) {
        const rawToken = uuidv4();
        const hashedToken = hashToken(rawToken);

        await this.cacheManager.set(
          `invite:${hashedToken}`,
          witness.id,
          ms(
            this.configService.getOrThrow<string>(
              'auth.inviteTokenExpiry',
            ) as ms.StringValue,
          ),
        );

        await this.notificationService.sendTransactionWitnessInvite(
          witness.user.email,
          witness.user.firstName,
          rawToken,
          witness.user.phoneNumber,
        );
      }
    }

    // Handle new user invites
    if (witnessInvites && witnessInvites.length > 0) {
      for (const invite of witnessInvites) {
        // Check if user already exists by email
        let user = await prisma.user.findUnique({
          where: { email: invite.email },
        });

        // If not, create a placeholder user
        if (!user) {
          const { firstName, lastName } = splitName(invite.name);
          user = await prisma.user.create({
            data: {
              email: invite.email,
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

        let witness: Witness = undefined;
        if (!existingWitness) {
          // Create witness record WITHOUT invite token first (we'll store it in Redis)
          witness = await prisma.witness.create({
            data: {
              transactionId,
              userId: user.id,
              status: WitnessStatus.PENDING,
            },
          });
        } else if (
          existingWitness &&
          existingWitness.status === WitnessStatus.PENDING
        ) {
          // Check if we have a valid phone number from the User record if not in invite
          // We need to retrieve the existing token or create a new one if it expired.
          // Since we don't easily have the token if it's hashed in Redis,
          // simplest for re-invite is to generate a new token.
        }
        // Generate secure token and hash it
        const rawToken = uuidv4();
        const hashedToken = hashToken(rawToken);

        // Store in Redis: `invite:{hashedToken}` -> `witnessId`
        // TTL: 7 days (604800000 ms) by default
        await this.cacheManager.set(
          `invite:${hashedToken}`,
          witness.id || existingWitness.id,
          ms(
            this.configService.getOrThrow<string>(
              'auth.inviteTokenExpiry',
            ) as ms.StringValue,
          ),
        );

        const targetPhoneNumber = invite.phoneNumber || user.phoneNumber;
        const targetEmail = invite.email || user.email;
        const { firstName } = splitName(invite.name);
        const targetName = firstName || user.firstName;

        await this.notificationService.sendTransactionWitnessInvite(
          targetEmail,
          targetName,
          rawToken,
          targetPhoneNumber,
        );

        await this.notificationService.sendTransactionWitnessInvite(
          targetEmail,
          targetName,
          rawToken,
          targetPhoneNumber,
        );
      }
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

    // Start a transaction to ensure all witness records are created or nothing is
    const transaction = await this.prisma.$transaction(async (prisma) => {
      let parentTransaction = null;
      // If this is a GIFT conversion, validate parent existence and ownership
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
            'Cannot convert a transaction you do not own',
          );
        }

        if (
          parentTransaction.type !== 'GIVEN' &&
          parentTransaction.type !== 'RECEIVED'
        ) {
          throw new BadRequestException(
            'Only GIVEN or RECEIVED transactions can be converted to GIFT',
          );
        }

        // Validate amount doesn't exceed parent amount
        if (
          amount &&
          parentTransaction.amount &&
          Number(amount) > Number(parentTransaction.amount)
        ) {
          throw new BadRequestException(
            'Gift conversion amount cannot exceed parent transaction amount',
          );
        }
      }

      // Validate contactId if provided
      if (rest.contactId) {
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

      // If it's a conversion, log it in the parent's history as well
      if (rest.parentId && parentTransaction) {
        await prisma.transactionHistory.create({
          data: {
            transactionId: rest.parentId,
            userId,
            changeType: 'PARTIAL_CONVERSION_TO_GIFT',
            previousState: {
              amount: parentTransaction.amount,
              type: parentTransaction.type,
            },
            newState: {
              conversionId: transaction.id,
              giftAmount: amount,
              remainingAmount: parentTransaction.amount
                ? Number(parentTransaction.amount) - Number(amount)
                : 0,
            },
          },
        });
      }

      await this.processWitnesses(
        transaction.id,
        witnessUserIds,
        witnessInvites,
        prisma,
      );

      return transaction;
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.notificationService.sendTransactionCreatedEmail(
        user.email,
        user.firstName,
      );
    }

    return transaction;
  }

  async addWitness(addWitnessInput: AddWitnessInput, userId: string) {
    const { transactionId, witnessUserIds, witnessInvites } = addWitnessInput;

    const transaction = await this.findOne(transactionId, userId);

    return this.prisma.$transaction(async (prisma) => {
      await this.processWitnesses(
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
    });
  }

  async findAll(userId: string, filter?: FilterTransactionInput) {
    const where: Prisma.TransactionWhereInput = {
      createdById: userId,
    };

    if (filter) {
      if (filter.types && filter.types.length > 0) {
        where.type = { in: filter.types };
      }
      if (filter.status) {
        where.status = filter.status;
      }
      if (filter.contactId) {
        where.contactId = filter.contactId;
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
        where.OR = [
          { description: { contains: filter.search, mode: 'insensitive' } },
          { itemName: { contains: filter.search, mode: 'insensitive' } },
          {
            contact: {
              OR: [
                { firstName: { contains: filter.search, mode: 'insensitive' } },
                { lastName: { contains: filter.search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }
    }

    // Default to excluding cancelled transactions from general list
    if (!where.status) {
      where.status = { not: TransactionStatus.CANCELLED };
    }

    const items = await this.prisma.transaction.findMany({
      where,
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

    // Determine target currency for summary
    let targetCurrency = filter?.summaryCurrency || filter?.currency;
    if (!targetCurrency) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { preferredCurrency: true },
      });
      targetCurrency = user?.preferredCurrency || 'NGN';
    }

    const summary = await this.calculateConvertedSummary(where, targetCurrency);

    return {
      items,
      summary,
    };
  }

  private async calculateConvertedSummary(
    where: Prisma.TransactionWhereInput,
    targetCurrency: string,
  ) {
    const aggregations = await this.prisma.transaction.groupBy({
      by: ['type', 'returnDirection', 'currency'],
      where,
      _sum: {
        amount: true,
      },
    });

    const summary = {
      totalGiven: 0,
      totalReceived: 0,
      totalReturned: 0,
      totalReturnedToMe: 0,
      totalReturnedToOther: 0,
      totalExpense: 0,
      totalIncome: 0,
      totalGiftGiven: 0,
      totalGiftReceived: 0,
      netBalance: 0,
      currency: targetCurrency,
    };

    for (const agg of aggregations) {
      const amount = Number(agg._sum.amount) || 0;
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      if (agg.type === 'GIVEN') {
        summary.totalGiven += convertedAmount;
      } else if (agg.type === 'RECEIVED') {
        summary.totalReceived += convertedAmount;
      } else if (agg.type === 'RETURNED') {
        summary.totalReturned += convertedAmount;
        if (agg.returnDirection === 'TO_ME') {
          summary.totalReturnedToMe += convertedAmount;
        } else {
          summary.totalReturnedToOther += convertedAmount;
        }
      } else if (agg.type === 'EXPENSE') {
        summary.totalExpense += convertedAmount;
      } else if (agg.type === 'INCOME') {
        summary.totalIncome += convertedAmount;
      } else if (agg.type === 'GIFT') {
        if (agg.returnDirection === 'TO_ME') {
          summary.totalGiftReceived += convertedAmount;
        } else {
          summary.totalGiftGiven += convertedAmount;
        }
      }
    }

    summary.netBalance =
      summary.totalIncome -
      summary.totalExpense +
      summary.totalReceived -
      summary.totalGiven +
      summary.totalReturnedToMe -
      summary.totalReturnedToOther +
      summary.totalGiftReceived -
      summary.totalGiftGiven;

    return summary;
  }

  async groupByContact(userId: string, filter?: FilterTransactionInput) {
    const summaryWhere: Prisma.TransactionWhereInput = {
      createdById: userId,
      status: { not: TransactionStatus.CANCELLED },
    };

    if (filter?.types && filter.types.length > 0) {
      summaryWhere.type = { in: filter.types };
    }
    if (filter?.contactId) {
      summaryWhere.contactId = filter.contactId;
    }
    if (filter?.startDate || filter?.endDate) {
      summaryWhere.date = {
        ...(filter.startDate && { gte: filter.startDate }),
        ...(filter.endDate && { lte: filter.endDate }),
      };
    }
    if (filter?.minAmount !== undefined || filter?.maxAmount !== undefined) {
      summaryWhere.amount = {
        ...(filter.minAmount !== undefined && { gte: filter.minAmount }),
        ...(filter.maxAmount !== undefined && { lte: filter.maxAmount }),
      };
    }
    if (filter?.search) {
      summaryWhere.OR = [
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

    const aggregations = await this.prisma.transaction.groupBy({
      by: ['contactId', 'type', 'returnDirection', 'currency'],
      where: summaryWhere,
      _sum: {
        amount: true,
      },
    });

    // Get all contacts for this user to map names
    const contacts = await this.prisma.contact.findMany({
      where: { userId },
    });

    const contactMap = new Map(contacts.map((c) => [c.id, c]));

    // Group aggregations by contactId
    const groupedByContact = new Map<string | null, any>();

    for (const agg of aggregations) {
      const contactId = agg.contactId;
      if (!groupedByContact.has(contactId)) {
        groupedByContact.set(contactId, {
          totalGiven: 0,
          totalReceived: 0,
          totalReturned: 0,
          totalReturnedToMe: 0,
          totalReturnedToOther: 0,
          totalExpense: 0,
          totalIncome: 0,
          totalGiftGiven: 0,
          totalGiftReceived: 0,
          netBalance: 0,
          currency: targetCurrency,
        });
      }

      const summary = groupedByContact.get(contactId);
      const amount = Number(agg._sum.amount) || 0;
      if (amount === 0) continue;

      const convertedAmount = await this.exchangeRateService.convert(
        amount,
        agg.currency,
        targetCurrency,
      );

      if (agg.type === 'GIVEN') {
        summary.totalGiven += convertedAmount;
      } else if (agg.type === 'RECEIVED') {
        summary.totalReceived += convertedAmount;
      } else if (agg.type === 'RETURNED') {
        summary.totalReturned += convertedAmount;
        if (agg.returnDirection === 'TO_ME') {
          summary.totalReturnedToMe += convertedAmount;
        } else {
          summary.totalReturnedToOther += convertedAmount;
        }
      } else if (agg.type === 'EXPENSE') {
        summary.totalExpense += convertedAmount;
      } else if (agg.type === 'INCOME') {
        summary.totalIncome += convertedAmount;
      } else if (agg.type === 'GIFT') {
        if (agg.returnDirection === 'TO_ME') {
          summary.totalGiftReceived += convertedAmount;
        } else {
          summary.totalGiftGiven += convertedAmount;
        }
      }
    }

    // Calculate net balance for each contact and format result
    const result = Array.from(groupedByContact.entries()).map(
      ([contactId, summary]) => {
        summary.netBalance =
          summary.totalIncome -
          summary.totalExpense +
          summary.totalReceived -
          summary.totalGiven +
          summary.totalReturnedToMe -
          summary.totalReturnedToOther +
          summary.totalGiftReceived -
          summary.totalGiftGiven;

        return {
          contact: contactId ? contactMap.get(contactId) : null,
          summary,
        };
      },
    );

    return result;
  }

  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
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

    if (transaction.createdById !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this transaction',
      );
    }

    return transaction;
  }

  async update(
    id: string,
    updateTransactionInput: UpdateTransactionInput,
    userId: string,
  ) {
    const transaction = await this.findOne(id, userId);

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
    const changes: any = {};
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
      (w) => w.status === WitnessStatus.ACKNOWLEDGED,
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

    // Perform update and create history record in a transaction
    const [updatedTransaction] = await this.prisma.$transaction([
      this.prisma.transaction.update({
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
      }),
      this.prisma.transactionHistory.create({
        data: {
          transactionId: id,
          userId,
          changeType: hasAcknowledgedWitness ? 'UPDATE_POST_ACK' : 'UPDATE',
          previousState: previousState as any,
          newState: changes,
        },
      }),
    ]);

    return updatedTransaction;
  }

  async remove(id: string, userId: string) {
    const transaction = await this.findOne(id, userId);

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
          } as any,
          newState: {
            status: TransactionStatus.CANCELLED,
          },
        },
      }),
    ]);

    // Notify acknowledged witnesses
    const acknowledgedWitnesses = transaction.witnesses.filter(
      (w) => w.status === WitnessStatus.ACKNOWLEDGED,
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

  async findMyContactTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        contact: {
          linkedUserId: userId,
        },
      },
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
    });
  }
}
