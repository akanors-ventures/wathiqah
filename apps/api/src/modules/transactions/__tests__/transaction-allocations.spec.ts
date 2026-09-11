import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { ExchangeRateService } from '../../exchange-rate/exchange-rate.service';
import { InAppNotificationsService } from '../../in-app-notifications/in-app-notifications.service';
import { TransactionsService } from '../transactions.service';
import { TransactionAllocationsService } from '../transaction-allocations.service';
import { FakePrisma } from './fake-prisma';

/**
 * Allocation engine spec. Runs against FakePrisma rather than per-call jest
 * mocks: an allocation's whole point is that reading a balance back afterwards
 * gives a different answer, and a stubbed aggregate can't show that.
 */
describe('TransactionAllocationsService', () => {
  let prisma: FakePrisma;
  let service: TransactionAllocationsService;

  const FAWAZ = 'user-fawaz';
  const OTHER = 'user-other';
  const ORG = 'org-1';

  type TxSeed = Record<string, unknown> & { id: string };

  const seedTx = (row: TxSeed) => {
    prisma.transactions.set(row.id, {
      status: 'PENDING',
      category: 'FUNDS',
      currency: 'NGN',
      orgId: null,
      parentId: null,
      contactId: 'c-musa',
      createdById: FAWAZ,
      isMirroredFromProject: false,
      orgSourceTransactionId: null,
      ...row,
    });
  };

  const allocationsOn = (id: string) =>
    [...prisma.allocations.values()].filter(
      (a) => a.sourceTransactionId === id || a.targetTransactionId === id,
    );

  const historyFor = (id: string, changeType: string) =>
    prisma.histories.filter(
      (h) => h.transactionId === id && h.changeType === changeType,
    );

  beforeEach(async () => {
    prisma = new FakePrisma();
    prisma.seedUser({ id: FAWAZ, email: 'fawaz@example.com' });
    prisma.seedUser({ id: OTHER, email: 'other@example.com' });
    prisma.seedOrgMembership(ORG, FAWAZ, 'ADMIN');
    prisma.contacts.set('c-musa', { id: 'c-musa', linkedUserId: null });
    prisma.contacts.set('c-ade', { id: 'c-ade', linkedUserId: null });

    // ESCROWED 500 from Musa, and three separate loans out to him.
    seedTx({ id: 'esc-1', type: 'ESCROWED', amount: 500 });
    seedTx({ id: 'loan-1', type: 'LOAN_GIVEN', amount: 200 });
    seedTx({ id: 'loan-2', type: 'LOAN_GIVEN', amount: 150 });
    seedTx({ id: 'loan-3', type: 'LOAN_GIVEN', amount: 150 });

    const module = await Test.createTestingModule({
      providers: [
        TransactionsService,
        TransactionAllocationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(), getOrThrow: jest.fn() },
        },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { sendTransactionWitnessInvite: jest.fn() },
        },
        {
          provide: ExchangeRateService,
          useValue: { convert: jest.fn((a: number) => Promise.resolve(a)) },
        },
        {
          provide: InAppNotificationsService,
          useValue: { createSafely: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();
    service = module.get(TransactionAllocationsService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('no duplicate entry — the outcome this feature exists for', () => {
    it('settles three loans from one lump sum without creating a single transaction row', async () => {
      const createSpy = jest.spyOn(prisma.transaction, 'create');

      const created = await service.allocate(
        {
          sourceTransactionId: 'esc-1',
          allocations: [
            { targetTransactionId: 'loan-1', amount: 200 },
            { targetTransactionId: 'loan-2', amount: 150 },
            { targetTransactionId: 'loan-3', amount: 150 },
          ],
        },
        FAWAZ,
        null,
      );

      expect(created).toHaveLength(3);
      expect(prisma.allocations.size).toBe(3);
      // 4 transactions in, 4 transactions out. The old flow would have made 7.
      expect(createSpy).not.toHaveBeenCalled();
      expect(prisma.transactions.size).toBe(4);
    });

    it('flips every fully-settled endpoint to COMPLETED with an AUTO_SETTLED trail', async () => {
      await service.allocate(
        {
          sourceTransactionId: 'esc-1',
          allocations: [
            { targetTransactionId: 'loan-1', amount: 200 },
            { targetTransactionId: 'loan-2', amount: 150 },
            { targetTransactionId: 'loan-3', amount: 150 },
          ],
        },
        FAWAZ,
        null,
      );

      for (const id of ['esc-1', 'loan-1', 'loan-2', 'loan-3']) {
        expect(prisma.transactions.get(id)?.status).toBe('COMPLETED');
        expect(historyFor(id, 'AUTO_SETTLED')).toHaveLength(1);
      }
    });

    it('leaves the surplus as unapplied credit, source still PENDING', async () => {
      await service.allocate(
        {
          sourceTransactionId: 'esc-1',
          allocations: [{ targetTransactionId: 'loan-1', amount: 200 }],
        },
        FAWAZ,
        null,
      );

      expect(prisma.transactions.get('loan-1')?.status).toBe('COMPLETED');
      expect(prisma.transactions.get('esc-1')?.status).toBe('PENDING');
    });

    it('allocates in several passes over time', async () => {
      const pass = (targetTransactionId: string, amount: number) =>
        service.allocate(
          {
            sourceTransactionId: 'esc-1',
            allocations: [{ targetTransactionId, amount }],
          },
          FAWAZ,
          null,
        );

      await pass('loan-1', 200);
      await pass('loan-2', 150);
      expect(prisma.transactions.get('esc-1')?.status).toBe('PENDING');

      await pass('loan-3', 150);
      expect(prisma.transactions.get('esc-1')?.status).toBe('COMPLETED');
    });
  });

  describe('caps', () => {
    it('rejects more than the source has left unapplied', async () => {
      seedTx({ id: 'loan-big', type: 'LOAN_GIVEN', amount: 900 });
      await expect(
        service.allocate(
          {
            sourceTransactionId: 'esc-1',
            allocations: [{ targetTransactionId: 'loan-big', amount: 600 }],
          },
          FAWAZ,
          null,
        ),
      ).rejects.toThrow(/still unapplied/);
    });

    it('rejects more than the target has outstanding', async () => {
      await expect(
        service.allocate(
          {
            sourceTransactionId: 'esc-1',
            allocations: [{ targetTransactionId: 'loan-1', amount: 300 }],
          },
          FAWAZ,
          null,
        ),
      ).rejects.toThrow(/outstanding on that obligation/);
    });

    it('counts an existing repayment child against the target cap', async () => {
      seedTx({
        id: 'repay-1',
        type: 'REPAYMENT_RECEIVED',
        amount: 120,
        parentId: 'loan-1',
        status: 'COMPLETED',
      });

      await expect(
        service.allocate(
          {
            sourceTransactionId: 'esc-1',
            allocations: [{ targetTransactionId: 'loan-1', amount: 100 }],
          },
          FAWAZ,
          null,
        ),
      ).rejects.toThrow(/outstanding on that obligation/);

      // 200 - 120 = 80 is still allocatable, and settles it.
      await service.allocate(
        {
          sourceTransactionId: 'esc-1',
          allocations: [{ targetTransactionId: 'loan-1', amount: 80 }],
        },
        FAWAZ,
        null,
      );
      expect(prisma.transactions.get('loan-1')?.status).toBe('COMPLETED');
    });

    it('rejects a non-positive amount', async () => {
      await expect(
        service.allocate(
          {
            sourceTransactionId: 'esc-1',
            allocations: [{ targetTransactionId: 'loan-1', amount: 0 }],
          },
          FAWAZ,
          null,
        ),
      ).rejects.toThrow(/greater than zero/);
    });
  });

  describe('the opposite-sign rule (Case C)', () => {
    it('refuses to settle a debt I owe from money I am already holding', async () => {
      // ESCROWED 500 is -500 to contact standing; LOAN_RECEIVED 200 is another
      // -200. Allowing a 200 allocation would leave -300 instead of -700: a
      // +400 swing for a 200 allocation, with no cash having moved. Two
      // liabilities pointing the same way have no counter-claim to net off.
      seedTx({ id: 'borrowed-1', type: 'LOAN_RECEIVED', amount: 200 });

      await expect(
        service.allocate(
          {
            sourceTransactionId: 'esc-1',
            allocations: [{ targetTransactionId: 'borrowed-1', amount: 200 }],
          },
          FAWAZ,
          null,
        ),
      ).rejects.toThrow(/Convert to Gift/);
      expect(prisma.allocations.size).toBe(0);
    });

    it('accepts an outgoing lump sum against the debts I owe', async () => {
      seedTx({ id: 'rem-1', type: 'REMITTED', amount: 300 });
      seedTx({ id: 'borrowed-1', type: 'LOAN_RECEIVED', amount: 300 });

      await service.allocate(
        {
          sourceTransactionId: 'rem-1',
          allocations: [{ targetTransactionId: 'borrowed-1', amount: 300 }],
        },
        FAWAZ,
        null,
      );

      expect(prisma.transactions.get('rem-1')?.status).toBe('COMPLETED');
      expect(prisma.transactions.get('borrowed-1')?.status).toBe('COMPLETED');
    });

    it('settles an advance and a deposit from the same credit', async () => {
      seedTx({ id: 'adv-1', type: 'ADVANCE_PAID', amount: 100 });
      seedTx({ id: 'dep-1', type: 'DEPOSIT_PAID', amount: 100 });

      await service.allocate(
        {
          sourceTransactionId: 'esc-1',
          allocations: [
            { targetTransactionId: 'adv-1', amount: 100 },
            { targetTransactionId: 'dep-1', amount: 100 },
          ],
        },
        FAWAZ,
        null,
      );

      expect(prisma.transactions.get('adv-1')?.status).toBe('COMPLETED');
      expect(prisma.transactions.get('dep-1')?.status).toBe('COMPLETED');
    });
  });

  describe('cross-contact settlement', () => {
    it("lets one contact's credit settle another contact's loan", async () => {
      seedTx({
        id: 'esc-ade',
        type: 'ESCROWED',
        amount: 100,
        contactId: 'c-ade',
      });

      await service.allocate(
        {
          sourceTransactionId: 'esc-ade',
          allocations: [{ targetTransactionId: 'loan-1', amount: 100 }],
        },
        FAWAZ,
        null,
      );

      const [link] = allocationsOn('esc-ade');
      expect(link.targetTransactionId).toBe('loan-1');
      expect(prisma.transactions.get('esc-ade')?.status).toBe('COMPLETED');
      expect(prisma.transactions.get('loan-1')?.status).toBe('PENDING');
    });
  });

  describe('rejections', () => {
    const attempt = (
      target: string,
      amount = 100,
      userId = FAWAZ,
      orgId: string | null = null,
      source = 'esc-1',
    ) =>
      service.allocate(
        {
          sourceTransactionId: source,
          allocations: [{ targetTransactionId: target, amount }],
        },
        userId,
        orgId,
      );

    it('rejects a currency mismatch', async () => {
      seedTx({
        id: 'loan-usd',
        type: 'LOAN_GIVEN',
        amount: 200,
        currency: 'USD',
      });
      await expect(attempt('loan-usd')).rejects.toThrow(/Currency mismatch/);
    });

    it('rejects endpoints on different ledgers', async () => {
      seedTx({
        id: 'esc-org',
        type: 'ESCROWED',
        amount: 500,
        orgId: ORG,
      });
      // Source is org-scoped, target is personal — same user, different ledger.
      await expect(
        attempt('loan-1', 100, FAWAZ, ORG, 'esc-org'),
      ).rejects.toThrow(/different ledgers/);
    });

    it('rejects a personal reflection of an org transaction', async () => {
      seedTx({
        id: 'loan-mirror',
        type: 'LOAN_GIVEN',
        amount: 200,
        orgSourceTransactionId: 'some-org-tx',
      });
      await expect(attempt('loan-mirror')).rejects.toThrow(
        /personal-ledger reflection/,
      );
    });

    it('rejects a project-synced transaction', async () => {
      seedTx({
        id: 'loan-proj',
        type: 'LOAN_GIVEN',
        amount: 200,
        isMirroredFromProject: true,
      });
      await expect(attempt('loan-proj')).rejects.toThrow(
        /synced from a project/,
      );
    });

    it('rejects a cancelled endpoint', async () => {
      seedTx({
        id: 'loan-dead',
        type: 'LOAN_GIVEN',
        amount: 200,
        status: 'CANCELLED',
      });
      await expect(attempt('loan-dead')).rejects.toThrow(/cancelled/);
    });

    it('rejects an item (non-FUNDS) endpoint', async () => {
      seedTx({
        id: 'loan-item',
        type: 'LOAN_GIVEN',
        amount: 200,
        category: 'ITEM',
      });
      await expect(attempt('loan-item')).rejects.toThrow(
        /monetary records only/,
      );
    });

    it('rejects allocating a transaction against itself', async () => {
      await expect(attempt('esc-1')).rejects.toThrow(/against itself/);
    });

    it('rejects a non-obligation target outright', async () => {
      seedTx({ id: 'gift-1', type: 'GIFT_GIVEN', amount: 100 });
      await expect(attempt('gift-1')).rejects.toThrow(
        /no outstanding balance to settle/,
      );
    });

    it('rejects a target that is itself a settlement child', async () => {
      // A REMITTED child of an escrow: a lifecycle type, so it clears the type
      // gate and reaches the parentId gate. Its balance belongs to the parent.
      seedTx({
        id: 'rem-child-2',
        type: 'REMITTED',
        amount: 100,
        parentId: 'esc-1',
      });
      await expect(
        attempt('rem-child-2', 100, FAWAZ, null, 'esc-1'),
      ).rejects.toThrow(/allocate against the original obligation/);
    });

    it('rejects a source that is not a credit pool type', async () => {
      await expect(
        attempt('loan-1', 100, FAWAZ, null, 'loan-2'),
      ).rejects.toThrow(/escrow.*remittance|remittance/);
    });

    it('rejects a source that is a child of another transaction', async () => {
      seedTx({
        id: 'rem-child',
        type: 'REMITTED',
        amount: 100,
        parentId: 'esc-1',
      });
      await expect(
        attempt('loan-1', 100, FAWAZ, null, 'rem-child'),
      ).rejects.toThrow(/credit pool of its own/);
    });

    it('rejects the same obligation twice in one pass', async () => {
      await expect(
        service.allocate(
          {
            sourceTransactionId: 'esc-1',
            allocations: [
              { targetTransactionId: 'loan-1', amount: 100 },
              { targetTransactionId: 'loan-1', amount: 50 },
            ],
          },
          FAWAZ,
          null,
        ),
      ).rejects.toThrow(/twice in one allocation pass/);
    });

    it('rejects a shared-ledger viewer who can read but not write', async () => {
      prisma.contacts.set('c-musa', { id: 'c-musa', linkedUserId: OTHER });
      await expect(attempt('loan-1', 100, OTHER)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.allocations.size).toBe(0);
    });

    it('404s a missing endpoint', async () => {
      await expect(attempt('nope')).rejects.toThrow(
        /Obligation nope not found/,
      );
    });
  });

  describe('atomicity', () => {
    it('applies none of a multi-target pass when one row fails', async () => {
      await expect(
        service.allocate(
          {
            sourceTransactionId: 'esc-1',
            allocations: [
              { targetTransactionId: 'loan-1', amount: 200 },
              { targetTransactionId: 'loan-2', amount: 999 },
            ],
          },
          FAWAZ,
          null,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.allocations.size).toBe(0);
      expect(prisma.transactions.get('loan-1')?.status).toBe('PENDING');
    });
  });

  describe('audit trail', () => {
    it('writes one history row per endpoint, with no top-level type key', async () => {
      await service.allocate(
        {
          sourceTransactionId: 'esc-1',
          allocations: [{ targetTransactionId: 'loan-1', amount: 200 }],
        },
        FAWAZ,
        null,
      );

      const applied = historyFor('esc-1', 'ALLOCATION_APPLIED');
      const received = historyFor('loan-1', 'ALLOCATION_RECEIVED');
      expect(applied).toHaveLength(1);
      expect(received).toHaveLength(1);

      // flipStatePerspective rewrites any top-level `type` through
      // PERSPECTIVE_FLIP_MAP for shared-ledger viewers. With two endpoints in
      // one payload a single flipped type would be ambiguous, so the
      // counterpart is referenced by id instead.
      for (const row of [...applied, ...received]) {
        expect(Object.keys(row.newState as object)).not.toContain('type');
        expect(Object.keys(row.previousState as object)).not.toContain('type');
      }

      expect(received[0].newState).toMatchObject({
        amount: 200,
        direction: 'IN',
        counterpartTransactionId: 'esc-1',
        counterpartContactId: 'c-musa',
      });
      expect(applied[0].newState).toMatchObject({
        direction: 'OUT',
        counterpartTransactionId: 'loan-1',
      });
    });
  });

  describe('reverse', () => {
    let allocationId: string;

    beforeEach(async () => {
      const [created] = await service.allocate(
        {
          sourceTransactionId: 'esc-1',
          allocations: [{ targetTransactionId: 'loan-1', amount: 200 }],
        },
        FAWAZ,
        null,
      );
      allocationId = created.id as string;
    });

    it('reopens the target and restores both balances', async () => {
      expect(prisma.transactions.get('loan-1')?.status).toBe('COMPLETED');

      await service.reverse(allocationId, FAWAZ, null);

      expect(prisma.allocations.get(allocationId)?.status).toBe('REVERSED');
      expect(prisma.allocations.get(allocationId)?.reversedById).toBe(FAWAZ);
      expect(prisma.transactions.get('loan-1')?.status).toBe('PENDING');
      expect(historyFor('loan-1', 'AUTO_REOPENED')).toHaveLength(1);
      expect(historyFor('esc-1', 'ALLOCATION_REVERSED')).toHaveLength(1);
      expect(historyFor('loan-1', 'ALLOCATION_REVERSED')).toHaveLength(1);
    });

    it('frees the credit up to be allocated somewhere else', async () => {
      await service.reverse(allocationId, FAWAZ, null);

      await service.allocate(
        {
          sourceTransactionId: 'esc-1',
          allocations: [{ targetTransactionId: 'loan-2', amount: 150 }],
        },
        FAWAZ,
        null,
      );
      expect(prisma.transactions.get('loan-2')?.status).toBe('COMPLETED');
    });

    it('is idempotent', async () => {
      await service.reverse(allocationId, FAWAZ, null);
      const historyCount = prisma.histories.length;

      const second = await service.reverse(allocationId, FAWAZ, null);

      expect(second.status).toBe('REVERSED');
      expect(prisma.histories).toHaveLength(historyCount);
    });

    it('404s an unknown allocation', async () => {
      await expect(service.reverse('nope', FAWAZ, null)).rejects.toThrow(
        /not found/,
      );
    });

    it('does not double-write when two reverse() calls race on the same allocation', async () => {
      // Regression: the idempotency check used to read `status` once, before
      // acquiring the row lock — two near-simultaneous calls could both pass
      // it while still ACTIVE, both proceed to the write, and the second
      // writer's reversedAt/reversedById would silently overwrite the
      // first's, misattributing the audit trail. The write now happens
      // behind a re-check taken under the lock.
      const [first, second] = await Promise.all([
        service.reverse(allocationId, FAWAZ, null),
        service.reverse(allocationId, FAWAZ, null),
      ]);

      expect(first.status).toBe('REVERSED');
      expect(second.status).toBe('REVERSED');
      expect(historyFor('esc-1', 'ALLOCATION_REVERSED')).toHaveLength(1);
      expect(historyFor('loan-1', 'ALLOCATION_REVERSED')).toHaveLength(1);
    });
  });

  describe('listForTransaction', () => {
    const asParent = (id: string) => {
      const row = prisma.transactions.get(id) as Record<string, unknown>;
      return {
        id,
        orgId: (row.orgId as string | null) ?? null,
        contactId: (row.contactId as string | null) ?? null,
        createdById: row.createdById as string,
      };
    };

    it('reads the same link from both ends', async () => {
      await service.allocate(
        {
          sourceTransactionId: 'esc-1',
          allocations: [{ targetTransactionId: 'loan-1', amount: 200 }],
        },
        FAWAZ,
        null,
      );

      const out = await service.listForTransaction(
        asParent('esc-1'),
        'OUT',
        FAWAZ,
      );
      const inbound = await service.listForTransaction(
        asParent('loan-1'),
        'IN',
        FAWAZ,
      );

      expect(out).toHaveLength(1);
      expect(inbound).toHaveLength(1);
      expect(out[0].id).toBe(inbound[0].id);
    });

    describe('shared-ledger redaction', () => {
      // Musa is a registered user linked to contact c-musa, so he can READ
      // Fawaz's loan to him. He must not learn that Ade — a contact of
      // Fawaz's he has nothing to do with — is who handed over the money.
      const MUSA = 'user-musa';

      beforeEach(async () => {
        prisma.seedUser({ id: MUSA, email: 'musa@example.com' });
        prisma.contacts.set('c-musa', {
          id: 'c-musa',
          name: 'Musa',
          linkedUserId: MUSA,
        });
        prisma.contacts.set('c-ade', {
          id: 'c-ade',
          name: 'Ade',
          linkedUserId: null,
        });
        seedTx({
          id: 'esc-ade',
          type: 'ESCROWED',
          amount: 100,
          contactId: 'c-ade',
        });

        await service.allocate(
          {
            sourceTransactionId: 'esc-ade',
            allocations: [{ targetTransactionId: 'loan-1', amount: 100 }],
          },
          FAWAZ,
          null,
        );
      });

      it("hides another contact's counterpart from a shared-ledger viewer", async () => {
        const [row] = await service.listForTransaction(
          asParent('loan-1'),
          'IN',
          MUSA,
        );

        expect(row.amount).toBe(100);
        expect(row.status).toBe('ACTIVE');
        expect(row.sourceTransaction).toBeNull();
        expect(row.targetTransaction).toBeNull();
        expect(row.note).toBeNull();
      });

      it('shows the owner the full counterpart', async () => {
        const [row] = await service.listForTransaction(
          asParent('loan-1'),
          'IN',
          FAWAZ,
        );

        expect(row.sourceTransaction?.id).toBe('esc-ade');
        expect(row.sourceTransaction?.contact?.id).toBe('c-ade');
      });

      it('keeps a same-contact counterpart visible to the linked contact', async () => {
        await service.allocate(
          {
            sourceTransactionId: 'esc-1',
            allocations: [{ targetTransactionId: 'loan-2', amount: 150 }],
          },
          FAWAZ,
          null,
        );

        const [row] = await service.listForTransaction(
          asParent('loan-2'),
          'IN',
          MUSA,
        );

        expect(row.sourceTransaction?.id).toBe('esc-1');
      });

      it('does not redact org rows — members share the whole org ledger', async () => {
        seedTx({ id: 'org-esc', type: 'ESCROWED', amount: 100, orgId: ORG });
        seedTx({
          id: 'org-loan',
          type: 'LOAN_GIVEN',
          amount: 100,
          orgId: ORG,
          contactId: 'c-ade',
        });
        await service.allocate(
          {
            sourceTransactionId: 'org-esc',
            allocations: [{ targetTransactionId: 'org-loan', amount: 100 }],
          },
          FAWAZ,
          ORG,
        );

        const [row] = await service.listForTransaction(
          asParent('org-loan'),
          'IN',
          OTHER,
        );

        expect(row.sourceTransaction?.id).toBe('org-esc');
      });
    });
  });
});
