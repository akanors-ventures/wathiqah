import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from './transactions.service';
import {
  AssetCategory,
  Prisma,
  TransactionStatus,
} from '../../generated/prisma/client';
import {
  computeOutstanding,
  isCreditSourceType,
  isLifecycleObligationType,
  isValueConservingPair,
} from './settlement.util';
import { AllocateTransactionsInput } from './dto/allocate-transactions.input';

/**
 * Comparison tolerance for the cap check. Amounts are Decimal(10,2) in the DB
 * but travel through the service layer as JS numbers, so splitting a principal
 * into thirds (500 → 166.67 + 166.67 + 166.66) can leave a sub-cent residue
 * that would reject a legitimate exact-remainder allocation.
 */
const EPSILON = 1e-9;

type EndpointRow = {
  id: string;
  type: string;
  amount: Prisma.Decimal | null;
  currency: string;
  category: AssetCategory;
  status: TransactionStatus;
  orgId: string | null;
  createdById: string;
  contactId: string | null;
  parentId: string | null;
  isMirroredFromProject: boolean;
  orgSourceTransactionId: string | null;
  contact?: { linkedUserId: string | null } | null;
};

@Injectable()
export class TransactionAllocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Applies part of a credit pool's unapplied balance against one or more
   * obligations. Creates NO Transaction rows — one real money movement stays
   * one transaction, and the links carry the rest.
   *
   * The whole pass is one DB transaction: either every target is allocated or
   * none is, so a validation failure on the third row cannot leave the first
   * two applied.
   */
  async allocate(
    input: AllocateTransactionsInput,
    userId: string,
    orgId: string | null,
  ) {
    const { sourceTransactionId, allocations, date, note } = input;

    if (!allocations || allocations.length === 0) {
      throw new BadRequestException('At least one allocation is required');
    }

    const targetIds = allocations.map((a) => a.targetTransactionId);
    if (new Set(targetIds).size !== targetIds.length) {
      throw new BadRequestException(
        'The same obligation cannot appear twice in one allocation pass',
      );
    }
    if (targetIds.includes(sourceTransactionId)) {
      throw new BadRequestException(
        'A transaction cannot be allocated against itself',
      );
    }
    for (const a of allocations) {
      if (!(a.amount > 0)) {
        throw new BadRequestException(
          'Allocation amount must be greater than zero',
        );
      }
    }

    const source = await this.loadEndpoint(sourceTransactionId, 'source');
    await this.assertEndpointUsable(source, userId, orgId, 'source');

    if (!isCreditSourceType(source.type)) {
      throw new BadRequestException(
        'Only money received (escrow) or money disbursed (remittance) can be allocated from',
      );
    }
    if (source.parentId) {
      throw new BadRequestException(
        'This is a settlement of another record, not a credit pool of its own',
      );
    }

    const targets = new Map<string, EndpointRow>();
    for (const id of targetIds) {
      const target = await this.loadEndpoint(id, 'target');
      await this.assertEndpointUsable(target, userId, orgId, 'target');

      if (!isLifecycleObligationType(target.type)) {
        throw new BadRequestException(
          `A ${target.type} transaction has no outstanding balance to settle`,
        );
      }
      if (target.parentId) {
        throw new BadRequestException(
          'Cannot allocate against a repayment, remittance or gift conversion — allocate against the original obligation instead',
        );
      }
      if (target.currency !== source.currency) {
        throw new BadRequestException(
          `Currency mismatch: the credit is in ${source.currency} but this obligation is in ${target.currency}. Cross-currency allocation is not supported.`,
        );
      }
      if (target.orgId !== source.orgId) {
        throw new ForbiddenException(
          'The credit and the obligation belong to different ledgers',
        );
      }
      // ⭐ The correctness core. See settlement.util.ts isValueConservingPair:
      // same-signed endpoints would move the balance by 2X for an X allocation,
      // inventing value that never moved.
      if (!isValueConservingPair(source.type, target.type)) {
        throw new BadRequestException(
          'Both records are obligations in the same direction — settling one from the other would create value that never moved. If the contact is writing off part of this debt, use Convert to Gift instead.',
        );
      }
      if (!target.contactId) {
        throw new BadRequestException(
          'An obligation must have a contact before it can be settled',
        );
      }
      targets.set(id, target);
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock every endpoint in a deterministic order. Without this, two
      // concurrent passes against one pool can both pass the cap and over-draw
      // it, and computeOutstanding's Math.max(0, ...) clamp would hide the
      // over-draw permanently. No CHECK constraint can express a cross-row sum.
      const lockIds = [sourceTransactionId, ...targetIds].sort();
      await tx.$queryRaw`SELECT id FROM "transactions" WHERE id IN (${Prisma.join(lockIds)}) FOR UPDATE`;

      const sourceSettled = await this.transactionsService.loadSettledAmount(
        tx,
        sourceTransactionId,
      );
      let sourceRemaining = computeOutstanding(source.amount, sourceSettled);

      const created = [];
      for (const { targetTransactionId, amount } of allocations) {
        const target = targets.get(targetTransactionId) as EndpointRow;

        const targetSettled = await this.transactionsService.loadSettledAmount(
          tx,
          targetTransactionId,
        );
        const targetOutstanding = computeOutstanding(
          target.amount,
          targetSettled,
        );

        if (amount > sourceRemaining + EPSILON) {
          throw new BadRequestException(
            `Allocation of ${amount} exceeds the ${sourceRemaining} still unapplied on this credit`,
          );
        }
        if (amount > targetOutstanding + EPSILON) {
          throw new BadRequestException(
            `Allocation of ${amount} exceeds the ${targetOutstanding} outstanding on that obligation`,
          );
        }

        const allocation = await tx.transactionAllocation.create({
          data: {
            sourceTransactionId,
            targetTransactionId,
            amount,
            currency: source.currency,
            date: date ?? new Date(),
            note: note ?? null,
            orgId: source.orgId,
            createdById: userId,
          },
        });
        created.push(allocation);
        sourceRemaining -= amount;

        // One history row per endpoint. Deliberately no top-level `type` key:
        // flipStatePerspective rewrites any top-level `type` through
        // PERSPECTIVE_FLIP_MAP for shared-ledger viewers, and with two
        // endpoints in one payload a single flipped type would be ambiguous.
        await tx.transactionHistory.createMany({
          data: [
            {
              transactionId: sourceTransactionId,
              userId,
              changeType: 'ALLOCATION_APPLIED',
              previousState: { remaining: sourceRemaining + amount },
              newState: {
                allocationId: allocation.id,
                amount,
                direction: 'OUT',
                counterpartTransactionId: targetTransactionId,
                counterpartContactId: target.contactId,
              },
            },
            {
              transactionId: targetTransactionId,
              userId,
              changeType: 'ALLOCATION_RECEIVED',
              previousState: { outstanding: targetOutstanding },
              newState: {
                allocationId: allocation.id,
                amount,
                direction: 'IN',
                counterpartTransactionId: sourceTransactionId,
                counterpartContactId: source.contactId,
              },
            },
          ],
        });

        await this.transactionsService.recomputeParentLoanStatus(
          tx,
          targetTransactionId,
          userId,
        );
      }

      await this.transactionsService.recomputeParentLoanStatus(
        tx,
        sourceTransactionId,
        userId,
      );

      return created;
    });
  }

  /**
   * Voids an allocation, restoring both endpoints' remaining balances and
   * reopening either if it had auto-settled. Soft (status REVERSED) rather than
   * a delete, so the history stays readable from both ends — matching how
   * cancelled transactions are handled. Idempotent.
   */
  async reverse(allocationId: string, userId: string, orgId: string | null) {
    const allocation = await this.prisma.transactionAllocation.findUnique({
      where: { id: allocationId },
    });
    if (!allocation) {
      throw new NotFoundException(`Allocation ${allocationId} not found`);
    }
    if (allocation.status === 'REVERSED') return allocation;

    const source = await this.loadEndpoint(
      allocation.sourceTransactionId,
      'source',
    );
    const target = await this.loadEndpoint(
      allocation.targetTransactionId,
      'target',
    );
    // A reversal only ever restores balances, so a CANCELLED endpoint is fine
    // here — assertEndpointUsable's usability rules would wrongly block it.
    await this.assertWriteAuthority(source, userId, orgId);
    await this.assertWriteAuthority(target, userId, orgId);

    return this.prisma.$transaction(async (tx) => {
      const lockIds = [
        allocation.sourceTransactionId,
        allocation.targetTransactionId,
      ].sort();
      await tx.$queryRaw`SELECT id FROM "transactions" WHERE id IN (${Prisma.join(lockIds)}) FOR UPDATE`;

      const updated = await tx.transactionAllocation.update({
        where: { id: allocationId },
        data: {
          status: 'REVERSED',
          reversedAt: new Date(),
          reversedById: userId,
        },
      });

      await tx.transactionHistory.createMany({
        data: [
          allocation.sourceTransactionId,
          allocation.targetTransactionId,
        ].map((transactionId) => ({
          transactionId,
          userId,
          changeType: 'ALLOCATION_REVERSED',
          previousState: { allocationId, status: 'ACTIVE' },
          newState: {
            allocationId,
            status: 'REVERSED',
            amount: Number(allocation.amount),
          },
        })),
      });

      // Order matters only for readability — each recompute reads the now
      // REVERSED row, so both see the restored balances.
      await this.transactionsService.recomputeParentLoanStatus(
        tx,
        allocation.sourceTransactionId,
        userId,
      );
      await this.transactionsService.recomputeParentLoanStatus(
        tx,
        allocation.targetTransactionId,
        userId,
      );

      return updated;
    });
  }

  /**
   * Allocations on one leg of a transaction, newest first. Includes REVERSED
   * rows — the UI distinguishes them. Access is already enforced by whoever
   * resolved the parent Transaction, so there is no re-check here.
   */
  async listForTransaction(transactionId: string, direction: 'IN' | 'OUT') {
    return this.prisma.transactionAllocation.findMany({
      where:
        direction === 'IN'
          ? { targetTransactionId: transactionId }
          : { sourceTransactionId: transactionId },
      include: {
        sourceTransaction: { include: { contact: true } },
        targetTransaction: { include: { contact: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  private async loadEndpoint(
    id: string,
    role: 'source' | 'target',
  ): Promise<EndpointRow> {
    const row = await this.prisma.transaction.findUnique({
      where: { id },
      include: { contact: { select: { linkedUserId: true } } },
    });
    if (!row) {
      throw new NotFoundException(
        role === 'source'
          ? `Credit transaction ${id} not found`
          : `Obligation ${id} not found`,
      );
    }
    return row as unknown as EndpointRow;
  }

  /** Shared usability rules: FUNDS, live, not a mirror, and writable. */
  private async assertEndpointUsable(
    row: EndpointRow,
    userId: string,
    orgId: string | null,
    role: 'source' | 'target',
  ): Promise<void> {
    if (row.category !== AssetCategory.FUNDS) {
      throw new BadRequestException(
        'Allocations apply to monetary records only, not items',
      );
    }
    if (row.status === TransactionStatus.CANCELLED) {
      throw new BadRequestException(
        `This ${role === 'source' ? 'credit' : 'obligation'} has been cancelled`,
      );
    }
    if (row.orgSourceTransactionId) {
      throw new BadRequestException(
        'This is a personal-ledger reflection of an organisation transaction. Record allocations from the organisation instead.',
      );
    }
    if (row.isMirroredFromProject) {
      throw new BadRequestException(
        'This transaction is synced from a project — edit it from the project page instead',
      );
    }
    await this.assertWriteAuthority(row, userId, orgId);
  }

  /**
   * Read access is not enough to allocate: a shared-ledger viewer can see the
   * other party's transaction but must never move its balance. Mirrors the
   * creator-only rule update() applies to personal rows.
   */
  private async assertWriteAuthority(
    row: EndpointRow,
    userId: string,
    orgId: string | null,
  ): Promise<void> {
    await this.transactionsService.assertTransactionAccess(row, userId, orgId);
    if (!row.orgId && row.createdById !== userId) {
      throw new ForbiddenException(
        'You can only allocate against your own transactions',
      );
    }
  }
}
