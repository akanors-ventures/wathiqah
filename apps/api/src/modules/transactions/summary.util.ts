import { TransactionType } from '../../generated/prisma/client';

/**
 * Perspective-flip pairs for shared-ledger view — a transaction the other
 * party created reads from this side with type and history entries flipped
 * to the equivalent counterpart (e.g. their LOAN_GIVEN is my LOAN_RECEIVED).
 */
export const PERSPECTIVE_FLIP_MAP: Partial<Record<string, string>> = {
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

export function computeNetBalance(summary: TransactionSummary): number {
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

/** Flips `type` on a TransactionHistory previous/new state snapshot. */
export function flipStatePerspective(
  state: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!state) return null;
  const flipped = { ...state };
  if (typeof state.type === 'string' && PERSPECTIVE_FLIP_MAP[state.type]) {
    flipped.type = PERSPECTIVE_FLIP_MAP[state.type];
  }
  return flipped;
}

/**
 * Re-renders a transaction from the non-creator's point of view: swaps in a
 * virtual contact built from the creator, flips the type (and any history
 * entries) to the equivalent counterpart. A no-op for the creator's own view.
 */
export function applyPerspective<
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
      previousState: flipStatePerspective(
        h.previousState as Record<string, unknown>,
      ),
      newState: flipStatePerspective(h.newState as Record<string, unknown>),
    }));
  }

  return transformed;
}
