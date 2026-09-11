/**
 * Settlement-aware Prisma mock helpers.
 *
 * `TransactionsService.loadSettledAmount` reads settlement through three
 * aggregates (child transactions, plus allocations on each leg) rather than the
 * single `transaction.findMany` the pre-allocation code used. These helpers let
 * the existing jest-mock specs keep expressing "the parent has these children"
 * as `transaction.findMany.mockResolvedValue([...])` — the aggregate simply
 * sums whatever findMany returns.
 *
 * The two allocation legs are dispatched on the `where` clause and backed by
 * SEPARATE stubs: one allocation row is either inbound or outbound for a given
 * transaction, never both, so a single shared stub would double-count it.
 */

type AmountRow = { amount: unknown };

const toNum = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value) || 0;
};

/** Prisma returns `{ _sum: { amount: null } }` for an empty aggregate. */
const sumOf = (rows: AmountRow[]) => ({
  _sum: {
    amount:
      rows.length === 0 ? null : rows.reduce((a, r) => a + toNum(r.amount), 0),
  },
});

export type AllocationMocks = {
  /** Rows where this transaction is the allocation TARGET (credit received). */
  in: jest.Mock;
  /** Rows where this transaction is the allocation SOURCE (credit drawn out). */
  out: jest.Mock;
};

/** Per-mock-object handles, so specs can stub each leg independently. */
const registry = new WeakMap<object, AllocationMocks>();

/**
 * Stub the allocation legs for a mock Prisma built by `withSettlementAggregates`.
 * Pass amounts, not rows. Re-apply per test: `jest.clearAllMocks()` wipes queued
 * return values, and leaking them across tests silently inflates settled sums.
 */
export function setAllocations(
  mockPrisma: object,
  legs: { in?: AmountRow[]; out?: AmountRow[] },
): void {
  const mocks = registry.get(mockPrisma);
  if (!mocks) {
    throw new Error(
      'setAllocations: mock was not built with withSettlementAggregates()',
    );
  }
  mocks.in.mockResolvedValue(legs.in ?? []);
  mocks.out.mockResolvedValue(legs.out ?? []);
}

/**
 * Adds `transaction.aggregate`, `transaction.groupBy` and a `transactionAllocation`
 * delegate to a jest-mock Prisma double. The transaction aggregate derives from
 * that delegate's own `findMany`, so existing per-test stubs keep working
 * unchanged; allocations default to empty.
 */
export type SettlementAllocationDelegate = {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  aggregate: jest.Mock;
  groupBy: jest.Mock;
};

export function withSettlementAggregates<T extends Record<string, unknown>>(
  mockPrisma: T,
): T & { transactionAllocation: SettlementAllocationDelegate } {
  const txDelegate = mockPrisma.transaction as Record<string, unknown>;

  const legIn = jest.fn().mockResolvedValue([]);
  const legOut = jest.fn().mockResolvedValue([]);
  registry.set(mockPrisma, { in: legIn, out: legOut });

  const legFor = async (where?: Record<string, unknown>) => {
    if (where && 'targetTransactionId' in where) {
      return (await legIn()) as AmountRow[];
    }
    if (where && 'sourceTransactionId' in where) {
      return (await legOut()) as AmountRow[];
    }
    return [] as AmountRow[];
  };

  (mockPrisma as Record<string, unknown>).transactionAllocation = {
    findMany: jest.fn(async (args?: { where?: Record<string, unknown> }) =>
      legFor(args?.where),
    ),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    aggregate: jest.fn(async (args?: { where?: Record<string, unknown> }) =>
      sumOf(await legFor(args?.where)),
    ),
    groupBy: jest.fn().mockResolvedValue([]),
  };

  txDelegate.aggregate = jest.fn(async (args?: unknown) => {
    const findMany = txDelegate.findMany as (a?: unknown) => Promise<unknown>;
    const rows = ((await findMany(args)) ?? []) as AmountRow[];
    return sumOf(rows);
  });

  if (!txDelegate.groupBy) {
    txDelegate.groupBy = jest.fn().mockResolvedValue([]);
  }

  return mockPrisma as T & {
    transactionAllocation: SettlementAllocationDelegate;
  };
}
