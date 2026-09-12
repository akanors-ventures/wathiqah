import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionStatus } from '../../generated/prisma/client';
import {
  computeOutstanding,
  computeSettledAmount,
  isLifecycleObligationType,
} from './settlement.util';

@Injectable()
export class TransactionSettlementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Total amount discharged against one transaction: non-cancelled children
   * (repayments / remittances / gift conversions) plus ACTIVE allocations on
   * BOTH legs. Three aggregates rather than findMany + reduce — same result,
   * less data over the wire.
   *
   * @internal call sites within TransactionsModule only
   */
  async loadSettledAmount(
    prisma: Prisma.TransactionClient,
    transactionId: string,
  ): Promise<number> {
    const [children, allocationsIn, allocationsOut] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          parentId: transactionId,
          status: { not: TransactionStatus.CANCELLED },
        },
      }),
      prisma.transactionAllocation.aggregate({
        _sum: { amount: true },
        where: { targetTransactionId: transactionId, status: 'ACTIVE' },
      }),
      prisma.transactionAllocation.aggregate({
        _sum: { amount: true },
        where: { sourceTransactionId: transactionId, status: 'ACTIVE' },
      }),
    ]);

    return computeSettledAmount({
      children: [{ amount: children._sum.amount }],
      allocationsIn: [{ amount: allocationsIn._sum.amount }],
      allocationsOut: [{ amount: allocationsOut._sum.amount }],
    });
  }

  /**
   * Batched form of loadSettledAmount: three groupBy queries regardless of how
   * many ids are passed. Used to pre-compute `remainingAmount` for a whole page
   * of results instead of one query per row (there is no DataLoader in this
   * codebase — see the remainingAmount ResolveField).
   *
   * @internal call sites within TransactionsModule only
   */
  async loadSettledAmounts(
    prisma: Prisma.TransactionClient,
    ids: string[],
  ): Promise<Map<string, number>> {
    const settled = new Map<string, number>();
    if (ids.length === 0) return settled;

    const [children, allocationsIn, allocationsOut] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['parentId'],
        _sum: { amount: true },
        where: {
          parentId: { in: ids },
          status: { not: TransactionStatus.CANCELLED },
        },
      }),
      prisma.transactionAllocation.groupBy({
        by: ['targetTransactionId'],
        _sum: { amount: true },
        where: { targetTransactionId: { in: ids }, status: 'ACTIVE' },
      }),
      prisma.transactionAllocation.groupBy({
        by: ['sourceTransactionId'],
        _sum: { amount: true },
        where: { sourceTransactionId: { in: ids }, status: 'ACTIVE' },
      }),
    ]);

    const add = (id: string | null, amount: unknown) => {
      if (!id) return;
      settled.set(id, (settled.get(id) ?? 0) + Number(amount ?? 0));
    };
    for (const row of children) add(row.parentId, row._sum.amount);
    for (const row of allocationsIn)
      add(row.targetTransactionId, row._sum.amount);
    for (const row of allocationsOut)
      add(row.sourceTransactionId, row._sum.amount);

    for (const id of ids) if (!settled.has(id)) settled.set(id, 0);
    return settled;
  }

  /**
   * Attaches a pre-computed `remainingAmount` to each lifecycle row in a page
   * of results. Three queries for the whole page instead of three per row —
   * the `remainingAmount` ResolveField short-circuits when the value is
   * already here. There is no DataLoader in this codebase; that is the general
   * fix and belongs in its own change.
   *
   * @internal call sites within TransactionsModule only
   */
  async attachRemainingAmounts<
    T extends { id: string; type: string; amount: unknown },
  >(items: T[]): Promise<T[]> {
    const lifecycleIds = items
      .filter((item) => isLifecycleObligationType(item.type) && item.amount)
      .map((item) => item.id);
    if (lifecycleIds.length === 0) return items;

    const settled = await this.loadSettledAmounts(this.prisma, lifecycleIds);
    return items.map((item) =>
      settled.has(item.id)
        ? {
            ...item,
            remainingAmount: computeOutstanding(
              item.amount as number,
              settled.get(item.id) ?? 0,
            ),
          }
        : item,
    );
  }

  /**
   * Recomputes a parent transaction's lifecycle status based on its
   * non-cancelled children.
   *
   * Applies to the three "lifecycle" parent types:
   *  - LOAN_GIVEN / LOAN_RECEIVED — children are repayments + gift conversions
   *  - ESCROWED — children are remittances (REMITTED)
   *
   * - PENDING (a.k.a. "ACTIVE"): outstanding > 0
   * - COMPLETED (a.k.a. "SETTLED"): outstanding === 0
   *
   * Cancelled parents are left as-is. A parent that flips between PENDING
   * and COMPLETED writes a TransactionHistory row so the audit trail
   * captures the auto-transition.
   */
  /** @internal call sites within TransactionsModule only */
  async recomputeParentLoanStatus(
    prisma: Prisma.TransactionClient,
    parentId: string,
    userId: string,
    // Caller may already have summed the non-cancelled children (e.g.
    // syncMirroredAmount computes this to validate the new amount) — skip
    // the redundant findMany when it's passed.
    preloadedSettledAmount?: number,
  ): Promise<void> {
    const parent = await prisma.transaction.findUnique({
      where: { id: parentId },
      select: { id: true, amount: true, status: true, type: true },
    });

    if (!parent || !parent.amount) return;
    if (parent.status === TransactionStatus.CANCELLED) return;
    // Only obligation types carry a "settled" lifecycle
    if (!isLifecycleObligationType(parent.type)) return;

    const settled =
      preloadedSettledAmount ??
      (await this.loadSettledAmount(prisma, parentId));
    const parentAmount = Number(parent.amount);
    const isFullySettled = settled >= parentAmount;
    const nextStatus = isFullySettled
      ? TransactionStatus.COMPLETED
      : TransactionStatus.PENDING;

    if (nextStatus === parent.status) return;

    await prisma.transaction.update({
      where: { id: parentId },
      data: { status: nextStatus },
    });

    await prisma.transactionHistory.create({
      data: {
        transactionId: parentId,
        userId,
        changeType: isFullySettled ? 'AUTO_SETTLED' : 'AUTO_REOPENED',
        previousState: { status: parent.status } as Prisma.InputJsonValue,
        newState: { status: nextStatus } as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Voids every ACTIVE allocation touching a transaction that is being
   * cancelled or deleted, and recomputes the surviving counterpart. Without
   * this, cancelling a credit pool would leave every obligation it settled
   * silently over-settled. Must run BEFORE a hard delete, while the rows are
   * still readable.
   *
   * @internal called by TransactionsService.remove()
   */
  async voidAllocationsFor(
    tx: Prisma.TransactionClient,
    transactionId: string,
    userId: string,
  ): Promise<void> {
    const active = await tx.transactionAllocation.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { sourceTransactionId: transactionId },
          { targetTransactionId: transactionId },
        ],
      },
    });
    if (active.length === 0) return;

    await tx.transactionAllocation.updateMany({
      where: { id: { in: active.map((a) => a.id) } },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedById: userId,
      },
    });

    for (const allocation of active) {
      const counterpartId =
        allocation.sourceTransactionId === transactionId
          ? allocation.targetTransactionId
          : allocation.sourceTransactionId;

      await tx.transactionHistory.create({
        data: {
          transactionId: counterpartId,
          userId,
          changeType: 'ALLOCATION_VOIDED',
          previousState: { allocationId: allocation.id, status: 'ACTIVE' },
          newState: {
            allocationId: allocation.id,
            status: 'REVERSED',
            amount: Number(allocation.amount),
            reason: 'counterpart transaction removed',
          },
        },
      });

      await this.recomputeParentLoanStatus(tx, counterpartId, userId);

      // The allocation being voided may itself have a personal-ledger echo
      // (maybeMirrorAllocation, transaction-allocations.service.ts) when the
      // credit and obligation are both org rows mirrored to the same user.
      // Without this, cancelling or deleting an org endpoint reversed the
      // org-side allocation but left the mirror ACTIVE — its obligation
      // stayed permanently COMPLETED with no path to fix it, since reverse()
      // short-circuits on an already-REVERSED org allocation before ever
      // reaching the mirror.
      const mirror = await tx.transactionAllocation.findUnique({
        where: { orgSourceAllocationId: allocation.id },
      });
      if (mirror && mirror.status === 'ACTIVE') {
        await tx.transactionAllocation.update({
          where: { id: mirror.id },
          data: {
            status: 'REVERSED',
            reversedAt: new Date(),
            reversedById: userId,
          },
        });

        await tx.transactionHistory.createMany({
          data: [
            {
              transactionId: mirror.sourceTransactionId,
              userId,
              changeType: 'ALLOCATION_VOIDED',
              previousState: { allocationId: mirror.id, status: 'ACTIVE' },
              newState: {
                allocationId: mirror.id,
                status: 'REVERSED',
                amount: Number(mirror.amount),
                reason: 'counterpart transaction removed',
              },
            },
            {
              transactionId: mirror.targetTransactionId,
              userId,
              changeType: 'ALLOCATION_VOIDED',
              previousState: { allocationId: mirror.id, status: 'ACTIVE' },
              newState: {
                allocationId: mirror.id,
                status: 'REVERSED',
                amount: Number(mirror.amount),
                reason: 'counterpart transaction removed',
              },
            },
          ],
        });

        await this.recomputeParentLoanStatus(
          tx,
          mirror.sourceTransactionId,
          userId,
        );
        await this.recomputeParentLoanStatus(
          tx,
          mirror.targetTransactionId,
          userId,
        );
      }
    }
  }

  /**
   * Org-scoped transactions (orgId set) are shared by every active member of
   * that org — same shape as ContactsService.assertContactAccess. Personal
   * transactions (orgId null) remain gated on creator-or-linked-contact.
   */
  /** @internal call sites within TransactionsModule only */
  async assertTransactionAccess(
    transaction: {
      orgId: string | null;
      createdById: string;
      contact?: { linkedUserId: string | null } | null;
    },
    userId: string,
    orgId: string | null,
  ): Promise<void> {
    if (transaction.orgId) {
      if (transaction.orgId !== orgId) {
        throw new ForbiddenException(
          'You do not have permission to access this transaction',
        );
      }
      const member = await this.prisma.organisationMember.findUnique({
        where: { orgId_userId: { orgId: transaction.orgId, userId } },
      });
      if (!member) {
        throw new ForbiddenException(
          'You do not have permission to access this transaction',
        );
      }
      return;
    }

    const isCreator = transaction.createdById === userId;
    const isLinkedContact = transaction.contact?.linkedUserId === userId;

    if (!isCreator && !isLinkedContact) {
      throw new ForbiddenException(
        'You do not have permission to access this transaction',
      );
    }
  }

  /**
   * Read access (assertTransactionAccess) is not the same as write access: a
   * shared-ledger linked contact can view a personal transaction but must
   * never mutate it — only its creator can. Org-scoped rows are shared by
   * every active member, so this only bites on personal (orgId null) rows.
   *
   * Single home for that rule. It used to be hand-written independently at
   * every call site (update(), remove(), and TransactionAllocationsService's
   * own copy) with drifting wording — exactly the gap this repo's CLAUDE.md
   * warns about for access-control checks. `action` only changes the message.
   */
  /** @internal call sites within TransactionsModule only */
  assertWriteAuthority(
    transaction: { orgId: string | null; createdById: string },
    userId: string,
    action: string,
  ): void {
    if (!transaction.orgId && transaction.createdById !== userId) {
      throw new ForbiddenException(`Only the creator can ${action}`);
    }
  }
}
