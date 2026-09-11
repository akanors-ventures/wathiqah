import { TransactionsResolver } from './transactions.resolver';

// Instantiated directly (bypassing Nest's TestingModule/DI container): the
// resolver class carries @UseInterceptors/@CheckFeature decorator metadata on
// other methods (createTransaction's sibling mutations) that would otherwise
// force this test to also wire up SubscriptionService/Reflector just to
// construct the class. Plain `new` sidesteps that — no decorator on
// projectTransaction() itself needs the DI container to run.
describe('TransactionsResolver — projectTransaction ResolveField', () => {
  let resolver: TransactionsResolver;
  let prisma: { projectTransaction: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { projectTransaction: { findUnique: jest.fn() } };
    resolver = new TransactionsResolver(
      {} as never,
      {} as never,
      {} as never,
      prisma as never,
    );
  });

  it("returns null for a linked contact viewing the creator's transaction from the flipped perspective, even when a project link exists", async () => {
    const transaction = {
      id: 'tx-1',
      createdById: 'creator-1',
      projectTransactionId: 'pt-1',
    } as never;

    const result = await resolver.projectTransaction(transaction, {
      id: 'linked-contact-user',
    } as never);

    expect(result).toBeNull();
    expect(prisma.projectTransaction.findUnique).not.toHaveBeenCalled();
  });

  it('returns the linked project transaction when the viewer is the creator', async () => {
    const transaction = {
      id: 'tx-1',
      createdById: 'creator-1',
      projectTransactionId: 'pt-1',
    } as never;
    prisma.projectTransaction.findUnique.mockResolvedValue({ id: 'pt-1' });

    const result = await resolver.projectTransaction(transaction, {
      id: 'creator-1',
    } as never);

    expect(result).toEqual({ id: 'pt-1' });
  });

  it('returns null when there is no project link at all, regardless of viewer', async () => {
    const transaction = {
      id: 'tx-1',
      createdById: 'creator-1',
      projectTransactionId: null,
    } as never;

    const result = await resolver.projectTransaction(transaction, {
      id: 'creator-1',
    } as never);

    expect(result).toBeNull();
    expect(prisma.projectTransaction.findUnique).not.toHaveBeenCalled();
  });
});

describe('TransactionsResolver — remainingAmount ResolveField', () => {
  const build = (settled: number) => {
    const transactionsService = {
      loadSettledAmount: jest.fn().mockResolvedValue(settled),
    };
    const resolver = new TransactionsResolver(
      transactionsService as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { resolver, transactionsService };
  };

  it('subtracts settlement from the principal', async () => {
    const { resolver } = build(120);
    await expect(
      resolver.remainingAmount({
        id: 'tx-1',
        type: 'LOAN_GIVEN',
        amount: 200,
      } as never),
    ).resolves.toBe(80);
  });

  it('resolves for an ADVANCE_PAID now that it carries a lifecycle', async () => {
    const { resolver } = build(0);
    await expect(
      resolver.remainingAmount({
        id: 'tx-1',
        type: 'ADVANCE_PAID',
        amount: 300,
      } as never),
    ).resolves.toBe(300);
  });

  it('returns null for a type with no outstanding balance', async () => {
    const { resolver, transactionsService } = build(0);
    await expect(
      resolver.remainingAmount({
        id: 'tx-1',
        type: 'GIFT_GIVEN',
        amount: 300,
      } as never),
    ).resolves.toBeNull();
    expect(transactionsService.loadSettledAmount).not.toHaveBeenCalled();
  });

  it('honours the value pre-computed by a list path instead of querying again', async () => {
    const { resolver, transactionsService } = build(999);
    await expect(
      resolver.remainingAmount({
        id: 'tx-1',
        type: 'LOAN_GIVEN',
        amount: 200,
        remainingAmount: 50,
      } as never),
    ).resolves.toBe(50);
    expect(transactionsService.loadSettledAmount).not.toHaveBeenCalled();
  });
});

describe('TransactionsResolver — allocation ResolveFields', () => {
  it('reads each leg through listForTransaction', async () => {
    const allocationsService = {
      listForTransaction: jest.fn().mockResolvedValue([{ id: 'alloc-1' }]),
    };
    const resolver = new TransactionsResolver(
      {} as never,
      {} as never,
      allocationsService as never,
      {} as never,
    );

    const parent = {
      id: 'tx-1',
      orgId: null,
      contactId: 'contact-1',
      createdById: 'fawaz',
    };

    await resolver.allocationsOut(parent as never, { id: 'fawaz' } as never);
    expect(allocationsService.listForTransaction).toHaveBeenCalledWith(
      parent,
      'OUT',
      'fawaz',
    );

    await resolver.allocationsIn(parent as never, { id: 'musa' } as never);
    expect(allocationsService.listForTransaction).toHaveBeenCalledWith(
      parent,
      'IN',
      'musa',
    );
  });
});
