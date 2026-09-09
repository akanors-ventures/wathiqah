/**
 * Settlement-aware Prisma mock helpers.
 *
 * `TransactionsService.loadSettledAmount` reads settlement through three
 * aggregates (child transactions + allocations on both legs) rather than the
 * single `transaction.findMany` the pre-allocation code used. These helpers let
 * the existing jest-mock specs keep expressing "the parent has these children"
 * as `transaction.findMany.mockResolvedValue([...])` — the aggregate simply
 * sums whatever findMany returns.
 *
 * Specs that need allocations in the sum stub `transactionAllocation.findMany`
 * the same way.
 */

type AmountRow = { amount: unknown };
type FindManyMock = { mockResolvedValue: unknown } & ((
  args?: unknown,
) => Promise<AmountRow[]>);

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

/**
 * Adds `transaction.aggregate`, `transaction.groupBy` and a full
 * `transactionAllocation` delegate to a jest-mock Prisma double, each deriving
 * from that delegate's own `findMany` so existing per-test stubs keep working
 * unchanged.
 */
export function withSettlementAggregates<T extends Record<string, unknown>>(
  mockPrisma: T,
): T {
  const txDelegate = mockPrisma.transaction as Record<string, unknown>;

  const allocationFindMany = jest.fn().mockResolvedValue([]);

  (mockPrisma as Record<string, unknown>).transactionAllocation = {
    findMany: allocationFindMany,
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    aggregate: jest.fn(async (args?: unknown) =>
      sumOf((await allocationFindMany(args)) as AmountRow[]),
    ),
    groupBy: jest.fn().mockResolvedValue([]),
  };

  txDelegate.aggregate = jest.fn(async (args?: unknown) => {
    const findMany = txDelegate.findMany as FindManyMock;
    const rows = ((await findMany(args)) ?? []) as AmountRow[];
    return sumOf(rows);
  });

  if (!txDelegate.groupBy) {
    txDelegate.groupBy = jest.fn().mockResolvedValue([]);
  }

  return mockPrisma;
}
