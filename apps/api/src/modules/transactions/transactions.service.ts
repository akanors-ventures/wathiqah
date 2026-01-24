import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { UpdateTransactionInput } from './dto/update-transaction.input';
import { AssetCategory, WitnessStatus } from '../../generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hashToken } from '../../common/utils/crypto.utils';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.$transaction(async (prisma) => {
      const transaction = await prisma.transaction.create({
        data: {
          category,
          amount,
          itemName,
          quantity: category === AssetCategory.ITEM ? quantity : null,
          createdById: userId,
          ...rest,
        },
      });

      // Handle existing users as witnesses
      if (witnessUserIds && witnessUserIds.length > 0) {
        await prisma.witness.createMany({
          data: witnessUserIds.map((witnessUserId) => ({
            transactionId: transaction.id,
            userId: witnessUserId,
            status: WitnessStatus.PENDING,
          })),
          skipDuplicates: true, // In case of duplicate IDs in input
        });
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
            user = await prisma.user.create({
              data: {
                email: invite.email,
                name: invite.name,
                passwordHash: null, // Indicates invited user
              },
            });
          }

          // Generate secure token and hash it
          const rawToken = uuidv4();
          const hashedToken = hashToken(rawToken);

          // Create witness record with hashed token
          await prisma.witness.create({
            data: {
              transactionId: transaction.id,
              userId: user.id,
              status: WitnessStatus.PENDING,
              inviteToken: hashedToken,
            },
          });

          // TODO: Send invitation email here with `rawToken` (future enhancement)
          // Example: await this.emailService.sendInvite(invite.email, rawToken);
        }
      }

      return transaction;
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

  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, createdById: userId },
      include: {
        witnesses: true,
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
      itemName: transaction.itemName,
      quantity: transaction.quantity,
      type: transaction.type,
      date: transaction.date,
      description: transaction.description,
      contactId: transaction.contactId,
    };

    // Business Rule: Check if any witness has acknowledged
    const hasAcknowledgedWitness = transaction.witnesses.some(
      (w) => w.status === WitnessStatus.ACKNOWLEDGED,
    );

    if (hasAcknowledgedWitness) {
      // Logic for post-acknowledgement update:
      // Mark witnesses as MODIFIED instead of PENDING to indicate an update occurred
      await this.prisma.witness.updateMany({
        where: { transactionId: id },
        data: {
          status: WitnessStatus.MODIFIED,
          acknowledgedAt: null,
        },
      });
    }

    const { category, amount, itemName, quantity, ...rest } =
      updateTransactionInput;

    // Re-validate category constraints if they are being updated
    if (category === AssetCategory.FUNDS && !amount && !transaction.amount) {
      // Note: This check is simplified; ideally check if 'amount' is in input OR exists in DB.
      // For PartialType, undefined means "do not update".
    }

    // Determine what actually changed for the history log
    const changes: any = {};
    if (category && category !== transaction.category)
      changes.category = category;
    if (amount && Number(amount) !== Number(transaction.amount))
      changes.amount = amount;
    if (itemName && itemName !== transaction.itemName)
      changes.itemName = itemName;
    if (quantity && quantity !== transaction.quantity)
      changes.quantity = quantity;
    if (rest.description && rest.description !== transaction.description)
      changes.description = rest.description;
    if (
      rest.date &&
      new Date(rest.date).getTime() !== new Date(transaction.date).getTime()
    )
      changes.date = rest.date;
    if (rest.type && rest.type !== transaction.type) changes.type = rest.type;
    if (rest.contactId && rest.contactId !== transaction.contactId)
      changes.contactId = rest.contactId;

    // Perform update and create history record in a transaction
    const [updatedTransaction] = await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id },
        data: {
          ...(category && { category }),
          ...(amount && { amount }),
          ...(itemName && { itemName }),
          ...(quantity && { quantity }),
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
}
