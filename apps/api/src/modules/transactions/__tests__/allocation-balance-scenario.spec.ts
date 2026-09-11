import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../../notifications/notification.service';
import { ExchangeRateService } from '../../exchange-rate/exchange-rate.service';
import { InAppNotificationsService } from '../../in-app-notifications/in-app-notifications.service';
import { ContactsService } from '../../contacts/contacts.service';
import { TransactionsService } from '../transactions.service';
import { TransactionAllocationsService } from '../transaction-allocations.service';
import { FakePrisma } from './fake-prisma';

/**
 * The invariant the whole allocation feature rests on:
 *
 *   An allocation is value-conserving iff the two endpoints have opposite
 *   contact-standing signs.
 *
 * An allocation creates no transaction row; it reduces the effective principal
 * of two rows at once by X. So Δ standing = −X·(s(src) + s(tgt)), which
 * vanishes exactly when the signs are opposite. No cash moved, so nothing may
 * move. These are the worked cases from the plan, asserted against real
 * ContactsService.getBalance reads either side of a real allocate() call.
 */
describe('Allocation × contact standing (scenario)', () => {
  let prisma: FakePrisma;
  let contacts: ContactsService;
  let allocations: TransactionAllocationsService;

  const FAWAZ = 'user-fawaz';

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
      ...row,
    });
  };

  const standing = (contactId: string) => contacts.getBalance(contactId, FAWAZ);

  const apply = (source: string, target: string, amount: number) =>
    allocations.allocate(
      {
        sourceTransactionId: source,
        allocations: [{ targetTransactionId: target, amount }],
      },
      FAWAZ,
      null,
    );

  beforeEach(async () => {
    prisma = new FakePrisma();
    prisma.seedUser({ id: FAWAZ, email: 'fawaz@example.com' });
    prisma.contacts.set('c-musa', {
      id: 'c-musa',
      linkedUserId: null,
      orgId: null,
      userId: FAWAZ,
    });
    prisma.contacts.set('c-ade', {
      id: 'c-ade',
      linkedUserId: null,
      orgId: null,
      userId: FAWAZ,
    });

    const module = await Test.createTestingModule({
      providers: [
        ContactsService,
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
          useValue: {
            sendTransactionWitnessInvite: jest.fn(),
            sendContactInvitationEmail: jest.fn(),
          },
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

    contacts = module.get(ContactsService);
    allocations = module.get(TransactionAllocationsService);
  });

  describe('Case A — same contact, opposite signs', () => {
    beforeEach(() => {
      seedTx({
        id: 'esc-1',
        type: 'ESCROWED',
        amount: 500,
        contactId: 'c-musa',
      });
      seedTx({
        id: 'loan-1',
        type: 'LOAN_GIVEN',
        amount: 200,
        contactId: 'c-musa',
      });
    });

    it('leaves the standing at −300 either side of a 200 allocation', async () => {
      // ESCROWED 500 (−500) + LOAN_GIVEN 200 (+200) = −300.
      expect(await standing('c-musa')).toBe(-300);

      await apply('esc-1', 'loan-1', 200);

      // Escrow effective 300 → −300; loan effective 0 → 0. Still −300.
      expect(await standing('c-musa')).toBe(-300);
    });

    it('restores nothing on reversal either — the reversal is neutral too', async () => {
      const [link] = await apply('esc-1', 'loan-1', 200);
      await allocations.reverse(link.id as string, FAWAZ, null);

      expect(await standing('c-musa')).toBe(-300);
      expect(prisma.transactions.get('loan-1')?.status).toBe('PENDING');
    });
  });

  describe('Case B — cross-contact, opposite signs', () => {
    it("zeroes both parties when one contact's credit clears another's loan", async () => {
      seedTx({
        id: 'esc-ade',
        type: 'ESCROWED',
        amount: 200,
        contactId: 'c-ade',
      });
      seedTx({
        id: 'loan-musa',
        type: 'LOAN_GIVEN',
        amount: 200,
        contactId: 'c-musa',
      });

      expect(await standing('c-ade')).toBe(-200);
      expect(await standing('c-musa')).toBe(200);

      await apply('esc-ade', 'loan-musa', 200);

      expect(await standing('c-ade')).toBe(0);
      expect(await standing('c-musa')).toBe(0);
    });
  });

  describe('Case C — same signs, rejected', () => {
    it('refuses the pair and leaves both standings untouched', async () => {
      // ESCROWED 500 (−500) + LOAN_RECEIVED 200 (−200) = −700. Allowing a 200
      // allocation would leave −300: a +400 swing for a 200 allocation, with
      // no cash movement at all. Two liabilities pointing the same way have no
      // counter-claim to net against. The real event that shrinks both is a
      // write-off, which is a gift — see the GIFT_* conversion path. Do not
      // relax this rule.
      seedTx({
        id: 'esc-1',
        type: 'ESCROWED',
        amount: 500,
        contactId: 'c-musa',
      });
      seedTx({
        id: 'borrowed-1',
        type: 'LOAN_RECEIVED',
        amount: 200,
        contactId: 'c-musa',
      });

      expect(await standing('c-musa')).toBe(-700);

      await expect(apply('esc-1', 'borrowed-1', 200)).rejects.toThrow(
        /Convert to Gift/,
      );

      expect(await standing('c-musa')).toBe(-700);
    });
  });

  describe('composition with gift conversions', () => {
    beforeEach(() => {
      // LOAN_GIVEN 200 to Musa, 50 of it written off as a gift.
      seedTx({
        id: 'loan-1',
        type: 'LOAN_GIVEN',
        amount: 200,
        contactId: 'c-musa',
      });
      seedTx({
        id: 'gift-1',
        type: 'GIFT_GIVEN',
        amount: 50,
        parentId: 'loan-1',
        contactId: 'c-musa',
        status: 'COMPLETED',
      });
      // The credit sits with a different contact so Musa's standing isolates
      // the loan.
      seedTx({
        id: 'esc-ade',
        type: 'ESCROWED',
        amount: 500,
        contactId: 'c-ade',
      });
    });

    it('subtracts gifts and allocations additively', async () => {
      expect(await standing('c-musa')).toBe(150);

      await apply('esc-ade', 'loan-1', 100);

      // 200 − 50 gifted − 100 allocated = 50.
      expect(await standing('c-musa')).toBe(50);
    });

    it('caps the next allocation at the gift-reduced remainder', async () => {
      await apply('esc-ade', 'loan-1', 100);

      await expect(apply('esc-ade', 'loan-1', 60)).rejects.toThrow(
        /outstanding on that obligation/,
      );

      await apply('esc-ade', 'loan-1', 50);
      expect(await standing('c-musa')).toBe(0);
      expect(prisma.transactions.get('loan-1')?.status).toBe('COMPLETED');
    });

    it('restores the standing when an allocation is reversed', async () => {
      const [link] = await apply('esc-ade', 'loan-1', 100);
      expect(await standing('c-musa')).toBe(50);

      await allocations.reverse(link.id as string, FAWAZ, null);

      expect(await standing('c-musa')).toBe(150);
      expect(prisma.transactions.get('loan-1')?.status).toBe('PENDING');
    });
  });
});
