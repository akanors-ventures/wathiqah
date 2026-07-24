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
    resolver = new TransactionsResolver({} as never, prisma as never);
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
