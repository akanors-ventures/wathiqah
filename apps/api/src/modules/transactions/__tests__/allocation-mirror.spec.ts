import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { ExchangeRateService } from '../../exchange-rate/exchange-rate.service';
import { InAppNotificationsService } from '../../in-app-notifications/in-app-notifications.service';
import { TransactionsService } from '../transactions.service';
import { TransactionAllocationsService } from '../transaction-allocations.service';
import { FakePrisma } from './fake-prisma';

/**
 * How allocations interact with the rest of the ledger machinery: personal
 * mirrors, cancellation and deletion. Each of these leaves a counterpart
 * over-settled if it is not handled, and an over-settled row is invisible —
 * computeOutstanding clamps at 0, so the error never surfaces as a negative.
 */
describe('Allocation × mirrors, cancellation and deletion', () => {
  let prisma: FakePrisma;
  let transactions: TransactionsService;
  let allocations: TransactionAllocationsService;

  const FAWAZ = 'user-fawaz';
  const BELLO = 'user-bello';
  const ORG = 'org-1';

  type TxSeed = Record<string, unknown> & { id: string };

  const seedTx = (row: TxSeed) => {
    prisma.transactions.set(row.id, {
      status: 'PENDING',
      category: 'FUNDS',
      currency: 'NGN',
      orgId: null,
      parentId: null,
      createdById: FAWAZ,
      isMirroredFromProject: false,
      orgSourceTransactionId: null,
      projectTransactionId: null,
      witnesses: [],
      ...row,
    });
  };

  const mirrorOf = (orgAllocationId: string) =>
    [...prisma.allocations.values()].find(
      (a) => a.orgSourceAllocationId === orgAllocationId,
    );

  beforeEach(async () => {
    prisma = new FakePrisma();
    prisma.seedUser({ id: FAWAZ, email: 'fawaz@example.com' });
    prisma.seedUser({ id: BELLO, email: 'bello@example.com' });
    prisma.seedOrgMembership(ORG, FAWAZ, 'ADMIN');
    prisma.seedOrgMembership(ORG, BELLO, 'OPERATOR');
    prisma.contacts.set('c-org', {
      id: 'c-org',
      linkedUserId: null,
      orgId: ORG,
    });
    prisma.contacts.set('c-personal', {
      id: 'c-personal',
      linkedUserId: null,
      orgId: null,
      userId: FAWAZ,
    });

    // Org-side pair.
    seedTx({
      id: 'esc-org',
      type: 'ESCROWED',
      amount: 500,
      orgId: ORG,
      contactId: 'c-org',
    });
    seedTx({
      id: 'loan-org',
      type: 'LOAN_GIVEN',
      amount: 200,
      orgId: ORG,
      contactId: 'c-org',
    });

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

    transactions = module.get(TransactionsService);
    allocations = module.get(TransactionAllocationsService);
  });

  const seedMirrors = (createdById = FAWAZ) => {
    seedTx({
      id: 'esc-mirror',
      type: 'ESCROWED',
      amount: 500,
      contactId: 'c-personal',
      orgSourceTransactionId: 'esc-org',
      createdById,
    });
    seedTx({
      id: 'loan-mirror',
      type: 'LOAN_GIVEN',
      amount: 200,
      contactId: 'c-personal',
      orgSourceTransactionId: 'loan-org',
      createdById,
    });
  };

  const allocateOrg = (amount = 200) =>
    allocations.allocate(
      {
        sourceTransactionId: 'esc-org',
        allocations: [{ targetTransactionId: 'loan-org', amount }],
      },
      FAWAZ,
      ORG,
    );

  describe('personal mirrors', () => {
    it('echoes the allocation when both endpoints are mirrored to this user', async () => {
      seedMirrors();

      const [orgAllocation] = await allocateOrg();

      const mirror = mirrorOf(orgAllocation.id as string);
      expect(mirror).toBeDefined();
      expect(mirror?.sourceTransactionId).toBe('esc-mirror');
      expect(mirror?.targetTransactionId).toBe('loan-mirror');
      expect(mirror?.orgId).toBeNull();
      // The point of mirroring: a loan recorded personally must settle
      // personally, or the mirrored loan never reaches COMPLETED.
      expect(prisma.transactions.get('loan-mirror')?.status).toBe('COMPLETED');
      expect(prisma.transactions.get('loan-org')?.status).toBe('COMPLETED');
    });

    it('skips entirely when only one endpoint is mirrored', async () => {
      seedTx({
        id: 'loan-mirror',
        type: 'LOAN_GIVEN',
        amount: 200,
        contactId: 'c-personal',
        orgSourceTransactionId: 'loan-org',
      });

      const [orgAllocation] = await allocateOrg();

      // A half-mirrored allocation would shrink the personal loan with no
      // personal credit to account for it.
      expect(mirrorOf(orgAllocation.id as string)).toBeUndefined();
      expect(prisma.allocations.size).toBe(1);
      expect(prisma.transactions.get('loan-mirror')?.status).toBe('PENDING');
    });

    it("never writes onto another member's personal ledger", async () => {
      seedMirrors(BELLO);

      const [orgAllocation] = await allocateOrg();

      expect(mirrorOf(orgAllocation.id as string)).toBeUndefined();
      expect(prisma.transactions.get('loan-mirror')?.status).toBe('PENDING');
    });

    it('reverses the mirror alongside the org original', async () => {
      seedMirrors();
      const [orgAllocation] = await allocateOrg();

      await allocations.reverse(orgAllocation.id as string, FAWAZ, ORG);

      expect(mirrorOf(orgAllocation.id as string)?.status).toBe('REVERSED');
      expect(prisma.transactions.get('loan-mirror')?.status).toBe('PENDING');
      expect(prisma.transactions.get('loan-org')?.status).toBe('PENDING');
    });

    it('does not mirror a purely personal allocation', async () => {
      seedTx({
        id: 'esc-p',
        type: 'ESCROWED',
        amount: 300,
        contactId: 'c-personal',
      });
      seedTx({
        id: 'loan-p',
        type: 'LOAN_GIVEN',
        amount: 300,
        contactId: 'c-personal',
      });

      await allocations.allocate(
        {
          sourceTransactionId: 'esc-p',
          allocations: [{ targetTransactionId: 'loan-p', amount: 300 }],
        },
        FAWAZ,
        null,
      );

      expect(prisma.allocations.size).toBe(1);
    });
  });

  describe('cancellation and deletion of an endpoint', () => {
    beforeEach(() => {
      seedTx({
        id: 'esc-p',
        type: 'ESCROWED',
        amount: 500,
        contactId: 'c-personal',
      });
      seedTx({
        id: 'loan-p',
        type: 'LOAN_GIVEN',
        amount: 200,
        contactId: 'c-personal',
      });
    });

    const allocatePersonal = () =>
      allocations.allocate(
        {
          sourceTransactionId: 'esc-p',
          allocations: [{ targetTransactionId: 'loan-p', amount: 200 }],
        },
        FAWAZ,
        null,
      );

    it('voids the allocations and reopens the counterpart when the credit is deleted', async () => {
      const [link] = await allocatePersonal();
      expect(prisma.transactions.get('loan-p')?.status).toBe('COMPLETED');

      await transactions.remove('esc-p', FAWAZ, null);

      // Without this the FK cascade would drop the link silently and leave the
      // loan settled by money that no longer exists.
      expect(prisma.allocations.get(link.id as string)?.status).toBe(
        'REVERSED',
      );
      expect(prisma.transactions.get('loan-p')?.status).toBe('PENDING');
      expect(
        prisma.histories.filter(
          (h) =>
            h.transactionId === 'loan-p' &&
            h.changeType === 'ALLOCATION_VOIDED',
        ),
      ).toHaveLength(1);
    });

    it('voids the allocations when the obligation is cancelled rather than deleted', async () => {
      const [link] = await allocatePersonal();
      // A witness forces the soft-cancel path instead of a hard delete.
      const row = prisma.transactions.get('loan-p');
      if (row) row.witnesses = [{ id: 'w-1' }];

      await transactions.remove('loan-p', FAWAZ, null);

      expect(prisma.transactions.get('loan-p')?.status).toBe('CANCELLED');
      expect(prisma.allocations.get(link.id as string)?.status).toBe(
        'REVERSED',
      );
      expect(
        prisma.histories.filter(
          (h) =>
            h.transactionId === 'esc-p' && h.changeType === 'ALLOCATION_VOIDED',
        ),
      ).toHaveLength(1);
    });

    it('frees the credit back up after the obligation is removed', async () => {
      await allocatePersonal();
      await transactions.remove('loan-p', FAWAZ, null);

      seedTx({
        id: 'loan-p2',
        type: 'LOAN_GIVEN',
        amount: 500,
        contactId: 'c-personal',
      });
      await allocations.allocate(
        {
          sourceTransactionId: 'esc-p',
          allocations: [{ targetTransactionId: 'loan-p2', amount: 500 }],
        },
        FAWAZ,
        null,
      );
      expect(prisma.transactions.get('loan-p2')?.status).toBe('COMPLETED');
    });
  });
});
