import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogProjectTransactionInput } from './dto/log-project-transaction.input';
import { UpdateProjectTransactionInput } from './dto/update-project-transaction.input';
import { FilterProjectTransactionInput } from './dto/filter-project-transaction.input';
import {
  ProjectTransactionType,
  TransactionType,
  TransactionStatus,
  WitnessStatus,
  Witness,
  Prisma,
} from '../../generated/prisma/client';
import { PaginatedProjectTransactionsResponse } from './entities/paginated-project-transactions-response.entity';
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

/**
 * Single source of truth for how a ProjectTransaction's amount/type nets
 * against `project.balance`: EXPENSE reduces it, INCOME increases it.
 * Shared across every call site that creates, edits, or reverses a project
 * balance effect — including `TransactionsService.deleteMirroredProjectTransaction`,
 * which imports this directly (a plain function import, not a Nest DI edge,
 * so it adds no module dependency between `TransactionsModule`/`ProjectsModule`).
 */
export function computeProjectTransactionBalanceEffect(
  type: ProjectTransactionType,
  amount: number,
): number {
  return type === ProjectTransactionType.EXPENSE ? -amount : amount;
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
    const { projectId } = input;

    // Verify project ownership
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    let notifications: WitnessNotification[] = [];
    const transaction = await this.prisma.$transaction(async (tx) => {
      const result = await this.createWithClient(
        tx as Prisma.TransactionClient,
        input,
      );
      notifications = result.notifications;
      return result.transaction;
    });

    await this.notifyWitnesses(notifications);

    return transaction;
  }

  async notifyWitnesses(notifications: WitnessNotification[]) {
    if (notifications.length === 0) return;
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

  /**
   * Leaf create logic accepting an externally-supplied transaction client so
   * `ProjectContactLinkService` can create the ProjectTransaction row inside
   * its own `$transaction` block (atomic with a mirrored Transaction write).
   * `extra` is set only by that internal caller — never client-settable via
   * the `logProjectTransaction` mutation's `LogProjectTransactionInput`.
   *
   * Note: the physical FK for this link lives on `Transaction.projectTransactionId`,
   * not here — `ProjectTransaction.transaction` is an inferred back-relation with
   * no column. When originating from the contact side, the caller must separately
   * update the Transaction row's `projectTransactionId` after this returns (this
   * row doesn't exist yet at the time the Transaction row itself is created).
   */
  async createWithClient(
    prisma: Prisma.TransactionClient,
    input: LogProjectTransactionInput,
    extra?: { isMirroredFromContact?: boolean },
  ): Promise<{
    transaction: Awaited<ReturnType<typeof prisma.projectTransaction.create>>;
    notifications: WitnessNotification[];
  }> {
    const {
      projectId,
      amount,
      type,
      witnessUserIds,
      witnessInvites,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      parentTransactionId, // Not a ProjectTransaction column — consumed by ProjectContactLinkService for mirror-linking, never persisted here
      ...rest
    } = input;

    if (amount <= 0) {
      throw new BadRequestException(
        'Transaction amount must be greater than zero',
      );
    }

    // Create the transaction
    const transaction = await prisma.projectTransaction.create({
      data: {
        projectId,
        amount,
        type,
        ...rest,
        ...(extra?.isMirroredFromContact
          ? { isMirroredFromContact: true }
          : {}),
      },
    });

    // Update project balance
    const balanceChange = computeProjectTransactionBalanceEffect(type, amount);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        balance: {
          increment: balanceChange,
        },
      },
    });

    // Process witnesses
    const notifications = await this.processWitnesses(
      transaction.id,
      witnessUserIds,
      witnessInvites,
      prisma,
    );

    return { transaction, notifications };
  }

  async update(userId: string, input: UpdateProjectTransactionInput) {
    return this.prisma.$transaction(async (tx) => {
      const result = await this.updateWithClient(
        tx as Prisma.TransactionClient,
        userId,
        input,
      );
      return result.transaction;
    });
  }

  /**
   * Leaf update logic accepting an externally-supplied transaction client so
   * `ProjectContactLinkService` can compose a retroactive contact-link (or an
   * amount edit needing a mirrored-Transaction sync) atomically with its own
   * write. `amountChanged`/`newAmount` let the orchestrator decide whether to
   * call `transactionsService.syncMirroredAmount` afterward.
   */
  async updateWithClient(
    prisma: Prisma.TransactionClient,
    userId: string,
    input: UpdateProjectTransactionInput,
    extraData?: Prisma.ProjectTransactionUncheckedUpdateInput,
  ): Promise<{
    transaction: Awaited<
      ReturnType<typeof prisma.projectTransaction.findUnique>
    >;
    amountChanged: boolean;
    newAmount: number;
  }> {
    const {
      id,
      amount,
      type,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      contactId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      contactTransactionType,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      parentTransactionId,
      ...rest
    } = input;

    // Fetch the existing transaction with its project
    const transaction = await prisma.projectTransaction.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Project transaction with ID ${id} not found`,
      );
    }

    // Only the project owner can update transactions
    if (transaction.project.userId !== userId) {
      throw new ForbiddenException(
        'Only the project owner can update this transaction',
      );
    }

    if (transaction.isMirroredFromContact) {
      throw new BadRequestException(
        'This transaction originated from a contact. Edit it from the contact page instead.',
      );
    }

    if (amount !== undefined && amount <= 0) {
      throw new BadRequestException(
        'Transaction amount must be greater than zero',
      );
    }

    // Capture previous state for audit log
    const previousState = {
      amount: Number(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      date: transaction.date,
      contactId: transaction.contactId,
      contactTransactionType: transaction.contactTransactionType,
    };

    // Determine what changed
    const changes: Prisma.ProjectTransactionUncheckedUpdateInput = {
      ...extraData,
    };
    const changeDescriptions: string[] = [];

    // extraData seeds `changes` above with contactId/contactTransactionType
    // for a retroactive project↔contact link (see ProjectContactLinkService).
    // Record it explicitly so the audit entry reads as "linked to a contact"
    // rather than falling through to the generic 'UPDATED' fallback below.
    if (extraData?.contactId && !transaction.contactId) {
      changeDescriptions.push('Linked to a contact');
    }

    if (amount !== undefined && Number(amount) !== Number(transaction.amount)) {
      changes.amount = amount;
      changeDescriptions.push(`Amount changed to ${amount}`);
    }
    if (type && type !== transaction.type) {
      changes.type = type;
      changeDescriptions.push(`Type changed to ${type}`);
    }
    if (rest.category !== undefined && rest.category !== transaction.category) {
      changes.category = rest.category;
      changeDescriptions.push(`Category changed to ${rest.category}`);
    }
    if (
      rest.description !== undefined &&
      rest.description !== transaction.description
    ) {
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

    const hasChanges = Object.keys(changes).length > 0;
    const amountChanged = changes.amount !== undefined;
    const newAmount =
      amount !== undefined ? amount : Number(transaction.amount);

    if (!hasChanges) {
      return {
        transaction: await prisma.projectTransaction.findUnique({
          where: { id },
          include: { witnesses: { include: { user: true } }, history: true },
        }),
        amountChanged: false,
        newAmount,
      };
    }

    // Balance adjustment when amount or type changes
    const oldAmount = Number(transaction.amount);
    const oldType = transaction.type;
    const newType = type ?? oldType;

    const oldBalanceEffect = computeProjectTransactionBalanceEffect(
      oldType,
      oldAmount,
    );
    const newBalanceEffect = computeProjectTransactionBalanceEffect(
      newType,
      newAmount,
    );
    const balanceDelta = newBalanceEffect - oldBalanceEffect;

    const updated = await prisma.projectTransaction.update({
      where: { id },
      data: changes,
      include: { witnesses: { include: { user: true } }, history: true },
    });

    // Update project balance if needed
    if (balanceDelta !== 0) {
      await prisma.project.update({
        where: { id: transaction.projectId },
        data: { balance: { increment: balanceDelta } },
      });
    }

    // Write audit history
    await prisma.projectTransactionHistory.create({
      data: {
        projectTransactionId: id,
        userId,
        previousState: previousState as Prisma.InputJsonValue,
        newState: changes as Prisma.InputJsonValue,
        changeType: changeDescriptions.join('; ') || 'UPDATED',
      },
    });

    return { transaction: updated, amountChanged, newAmount };
  }

  /**
   * Reverse direction of `TransactionsService.syncMirroredAmount`: keeps a
   * passive contact-originated ProjectTransaction mirror's amount and
   * `project.balance` in sync when the real Transaction it mirrors has its
   * amount edited. Bypasses `updateWithClient`'s `isMirroredFromContact`
   * guard by design — this IS the sanctioned path for mutating a mirror.
   */
  async syncMirroredAmount(
    prisma: Prisma.TransactionClient,
    projectTransactionId: string,
    newAmount: number,
    userId: string,
  ): Promise<void> {
    const mirrored = await prisma.projectTransaction.findUnique({
      where: { id: projectTransactionId },
      select: {
        type: true,
        amount: true,
        projectId: true,
        isMirroredFromContact: true,
      },
    });
    if (!mirrored) return;

    // Defense in depth: this method exists to mutate a passive contact→project
    // mirror, never a project-originated row directly (that goes through
    // updateWithClient's own guard). Guards against a future call site
    // passing the wrong id.
    if (!mirrored.isMirroredFromContact) {
      throw new ForbiddenException(
        'This project transaction was not created from a contact link and cannot be synced this way.',
      );
    }

    if (newAmount <= 0) {
      throw new BadRequestException(
        'Transaction amount must be greater than zero',
      );
    }

    const oldAmount = Number(mirrored.amount);
    if (newAmount === oldAmount) return;

    const oldBalanceEffect = computeProjectTransactionBalanceEffect(
      mirrored.type,
      oldAmount,
    );
    const newBalanceEffect = computeProjectTransactionBalanceEffect(
      mirrored.type,
      newAmount,
    );
    const balanceDelta = newBalanceEffect - oldBalanceEffect;

    await prisma.projectTransaction.update({
      where: { id: projectTransactionId },
      data: { amount: newAmount },
    });

    if (balanceDelta !== 0) {
      await prisma.project.update({
        where: { id: mirrored.projectId },
        data: { balance: { increment: balanceDelta } },
      });
    }

    await prisma.projectTransactionHistory.create({
      data: {
        projectTransactionId,
        userId,
        previousState: { amount: oldAmount } as Prisma.InputJsonValue,
        newState: { amount: newAmount } as Prisma.InputJsonValue,
        changeType: `Amount changed to ${newAmount}`,
      },
    });
  }

  async remove(userId: string, id: string) {
    return this.prisma.$transaction((tx) =>
      this.removeWithClient(tx as Prisma.TransactionClient, userId, id),
    );
  }

  /**
   * Leaf remove logic accepting an externally-supplied transaction client so
   * `ProjectContactLinkService` can delete a linked ProjectTransaction and
   * its mirrored Transaction atomically in one `$transaction`.
   */
  async removeWithClient(
    prisma: Prisma.TransactionClient,
    userId: string,
    id: string,
  ) {
    const transaction = await prisma.projectTransaction.findUnique({
      where: { id },
      include: { project: true, witnesses: true },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Project transaction with ID ${id} not found`,
      );
    }

    if (transaction.project.userId !== userId) {
      throw new ForbiddenException(
        'Only the project owner can delete this transaction',
      );
    }

    if (transaction.isMirroredFromContact) {
      throw new BadRequestException(
        'This transaction originated from a contact. Delete it from the contact page instead.',
      );
    }

    // Mirrors the personal-transaction "No Deletion" witness policy
    // (see WITNESS_SYSTEM.md): a witnessed record must never be
    // hard-deleted. ProjectTransaction has no CANCELLED status to fall
    // back to, so deletion is blocked outright rather than silently
    // cascading away the witness/audit trail.
    if (transaction.witnesses.length > 0) {
      throw new ForbiddenException(
        'This transaction has witnesses and cannot be deleted.',
      );
    }

    const balanceEffect = computeProjectTransactionBalanceEffect(
      transaction.type,
      Number(transaction.amount),
    );

    const deleted = await prisma.projectTransaction.delete({ where: { id } });

    await prisma.project.update({
      where: { id: transaction.projectId },
      data: { balance: { decrement: balanceEffect } },
    });

    return deleted;
  }

  /**
   * Outstanding loans/escrows with a given contact that originated from this
   * same project — powers the "which loan are you repaying" picker shown
   * when logging a repayment-type contact link from the project side.
   * Deliberately scoped to this project only; repaying a loan that
   * originated elsewhere (a different project, or the standalone contact
   * ledger) stays on the existing standalone `/transactions/new` flow.
   */
  async findOutstandingContactLoans(
    userId: string,
    projectId: string,
    contactId: string,
    contactTransactionType?: TransactionType,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Mirrors the parent-type pairing TransactionsService.createWithClient
    // actually enforces, so the picker never surfaces a loan that would fail
    // validation on submit: REPAYMENT_RECEIVED only closes a LOAN_GIVEN,
    // REPAYMENT_MADE only a LOAN_RECEIVED, REMITTED only an ESCROWED; gift
    // conversions accept either loan direction.
    const validParentTypes: Record<string, TransactionType[]> = {
      [TransactionType.REPAYMENT_RECEIVED]: [TransactionType.LOAN_GIVEN],
      [TransactionType.REPAYMENT_MADE]: [TransactionType.LOAN_RECEIVED],
      [TransactionType.REMITTED]: [TransactionType.ESCROWED],
      [TransactionType.GIFT_GIVEN]: [
        TransactionType.LOAN_GIVEN,
        TransactionType.LOAN_RECEIVED,
      ],
      [TransactionType.GIFT_RECEIVED]: [
        TransactionType.LOAN_GIVEN,
        TransactionType.LOAN_RECEIVED,
      ],
    };
    const allowedTypes = contactTransactionType
      ? (validParentTypes[contactTransactionType] ?? [])
      : [
          TransactionType.LOAN_GIVEN,
          TransactionType.LOAN_RECEIVED,
          TransactionType.ESCROWED,
        ];

    return this.prisma.transaction.findMany({
      where: {
        contactId,
        status: TransactionStatus.PENDING,
        type: { in: allowedTypes },
        projectTransaction: { projectId },
      },
      orderBy: { date: 'desc' },
    });
  }

  async usedCategories(userId: string, projectId: string): Promise<string[]> {
    // Folds the ownership check into the same query instead of a separate
    // project.findUnique round trip: a missing or not-owned project just
    // yields no rows, which is indistinguishable from "no categories yet"
    // for this suggestions-only endpoint (no sensitive data is exposed
    // either way).
    const rows = await this.prisma.projectTransaction.findMany({
      where: { projectId, category: { not: null }, project: { userId } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });

    return rows.map((row) => row.category as string);
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
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByProject(
    projectId: string,
    filter?: FilterProjectTransactionInput,
  ): Promise<PaginatedProjectTransactionsResponse> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 25;

    const where: Prisma.ProjectTransactionWhereInput = {
      projectId,
      ...(filter?.type && { type: filter.type }),
      ...(filter?.category && {
        category: { contains: filter.category, mode: 'insensitive' },
      }),
      ...((filter?.startDate || filter?.endDate) && {
        date: {
          ...(filter.startDate && { gte: filter.startDate }),
          ...(filter.endDate && { lte: filter.endDate }),
        },
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.projectTransaction.count({ where }),
      this.prisma.projectTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          witnesses: { include: { user: true } },
          history: true,
        },
      }),
    ]);

    return {
      items: items as unknown as PaginatedProjectTransactionsResponse['items'],
      total,
      page,
      limit,
    };
  }
}
