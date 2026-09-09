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
  TransactionType,
} from '../../generated/prisma/client';
import {
  CREDIT_SOURCE_TYPES,
  LIFECYCLE_OBLIGATION_TYPES,
  OBLIGATION_SIGN,
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

        await this.maybeMirrorAllocation(
          tx,
          allocation,
          source,
          target,
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

      await this.reverseMirrorOf(tx, allocationId, userId);

      return updated;
    });
  }

  /**
   * Echoes an org-side allocation onto the personal ledger when BOTH endpoints
   * carry a personal mirror owned by this user.
   *
   * A loan recorded personally has to settle personally or the mirrored loan
   * never reaches COMPLETED — the same principle maybeCreatePersonalMirror
   * applies to repayment children. Allocations are not children, so they need
   * their own echo.
   *
   * If only one endpoint is mirrored, skip entirely: a half-mirrored
   * allocation would shrink one personal row with nothing on the other side to
   * account for it, which is worse than not mirroring at all.
   */
  private async maybeMirrorAllocation(
    tx: Prisma.TransactionClient,
    allocation: { id: string; amount: Prisma.Decimal | number; date: Date },
    source: EndpointRow,
    target: EndpointRow,
    userId: string,
  ): Promise<void> {
    if (!source.orgId) return;

    const [sourceMirror, targetMirror] = await Promise.all([
      tx.transaction.findUnique({
        where: { orgSourceTransactionId: source.id },
        select: { id: true, createdById: true, currency: true },
      }),
      tx.transaction.findUnique({
        where: { orgSourceTransactionId: target.id },
        select: { id: true, createdById: true },
      }),
    ]);
    if (!sourceMirror || !targetMirror) return;
    // The mirrors belong to whichever member shared the contact and reflected
    // the original rows — never write onto a ledger another member controls.
    if (sourceMirror.createdById !== userId) return;
    if (targetMirror.createdById !== userId) return;

    await tx.transactionAllocation.create({
      data: {
        sourceTransactionId: sourceMirror.id,
        targetTransactionId: targetMirror.id,
        amount: allocation.amount,
        currency: sourceMirror.currency,
        date: allocation.date,
        orgId: null,
        createdById: userId,
        orgSourceAllocationId: allocation.id,
      },
    });

    await this.transactionsService.recomputeParentLoanStatus(
      tx,
      sourceMirror.id,
      userId,
    );
    await this.transactionsService.recomputeParentLoanStatus(
      tx,
      targetMirror.id,
      userId,
    );
  }

  /**
   * Reverses the personal-ledger echo alongside its org original. Without
   * this, reversing an org allocation leaves the personal mirror permanently
   * over-settled and its obligation stuck at COMPLETED.
   */
  private async reverseMirrorOf(
    tx: Prisma.TransactionClient,
    orgAllocationId: string,
    userId: string,
  ): Promise<void> {
    const mirror = await tx.transactionAllocation.findUnique({
      where: { orgSourceAllocationId: orgAllocationId },
    });
    if (!mirror || mirror.status === 'REVERSED') return;

    await tx.transactionAllocation.update({
      where: { id: mirror.id },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedById: userId,
      },
    });

    await this.transactionsService.recomputeParentLoanStatus(
      tx,
      mirror.sourceTransactionId,
      userId,
    );
    await this.transactionsService.recomputeParentLoanStatus(
      tx,
      mirror.targetTransactionId,
      userId,
    );
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

  /**
   * Credit pools with unapplied balance left, for the "settle from" picker.
   * `contactId` is optional on purpose: a contact paying on behalf of another
   * is one of the things this feature exists for.
   */
  async availableCredits(
    userId: string,
    orgId: string | null,
    contactId?: string,
    currency?: string,
  ) {
    return this.findAllocatable(
      userId,
      orgId,
      [...CREDIT_SOURCE_TYPES],
      contactId,
      currency,
    );
  }

  /**
   * Obligations this credit may legally settle: opposite standing sign, same
   * currency, still outstanding. Filters on the *computed* remainder rather
   * than a `status: PENDING` shortcut — status is a derived cache and a row
   * can be PENDING with nothing left after a gift conversion.
   */
  async allocatableObligations(
    sourceTransactionId: string,
    userId: string,
    orgId: string | null,
    contactId?: string,
  ) {
    const source = await this.loadEndpoint(sourceTransactionId, 'source');
    await this.assertEndpointUsable(source, userId, orgId, 'source');

    const sourceSign = OBLIGATION_SIGN[source.type];
    if (!sourceSign) return [];

    const opposite = LIFECYCLE_OBLIGATION_TYPES.filter(
      (type) => OBLIGATION_SIGN[type] === -sourceSign,
    );

    const rows = await this.findAllocatable(
      userId,
      orgId,
      opposite,
      contactId,
      source.currency,
    );
    return rows.filter((row) => row.id !== sourceTransactionId);
  }

  /**
   * Shared body of the two pickers: scope, hygiene filters, then drop anything
   * with nothing left on it. Capped at 50 — these feed a checkbox list, not a
   * report.
   */
  private async findAllocatable(
    userId: string,
    orgId: string | null,
    types: readonly string[],
    contactId?: string,
    currency?: string,
  ) {
    const rows = await this.prisma.transaction.findMany({
      where: {
        ...(orgId ? { orgId } : { createdById: userId, orgId: null }),
        type: { in: types as TransactionType[] },
        category: AssetCategory.FUNDS,
        status: { not: TransactionStatus.CANCELLED },
        parentId: null,
        orgSourceTransactionId: null,
        isMirroredFromProject: false,
        ...(contactId ? { contactId } : {}),
        ...(currency ? { currency } : {}),
      },
      include: { contact: true },
      orderBy: { date: 'desc' },
      take: 50,
    });

    const settled = await this.transactionsService.loadSettledAmounts(
      this.prisma,
      rows.map((row) => row.id),
    );

    return rows
      .map((row) => ({
        ...row,
        remainingAmount: computeOutstanding(
          row.amount,
          settled.get(row.id) ?? 0,
        ),
      }))
      .filter((row) => row.remainingAmount > 0);
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
