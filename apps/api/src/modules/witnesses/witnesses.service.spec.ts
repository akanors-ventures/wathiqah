import { Test } from '@nestjs/testing';
import { WitnessesService } from './witnesses.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationService } from '../notifications/notification.service';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service';
import { ConfigService } from '@nestjs/config';
import {
  WitnessStatus,
  TransactionType,
  NotificationType,
  AssetCategory,
} from '../../generated/prisma/client';

// ---------------------------------------------------------------------------
// Shared factory helpers
// ---------------------------------------------------------------------------

function makeWitness(overrides: Record<string, unknown> = {}) {
  return {
    id: 'witness-1',
    transactionId: 'tx-1',
    status: WitnessStatus.PENDING,
    userId: 'user-1',
    ...overrides,
  };
}

function makeUpdatedWitness(overrides: Record<string, unknown> = {}) {
  return {
    id: 'witness-1',
    transactionId: 'tx-1',
    status: WitnessStatus.ACKNOWLEDGED,
    acknowledgedAt: new Date(),
    userId: 'user-1',
    user: { firstName: 'Alhaji', lastName: 'Sule' },
    transaction: {
      id: 'tx-1',
      type: TransactionType.LOAN_GIVEN,
      amount: { toNumber: () => 50000 },
      currency: 'NGN',
      createdById: 'creator-1',
      createdBy: { firstName: 'Musa', lastName: 'Ibrahim' },
      contact: {
        firstName: 'Aminu',
        lastName: 'Bello',
        phoneNumber: '+2348012345678',
        email: 'aminu@example.com',
      },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// findMyRequests pagination
// ---------------------------------------------------------------------------

describe('WitnessesService — findMyRequests pagination', () => {
  let service: WitnessesService;
  let prisma: {
    witness: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      witness: { findMany: jest.fn(), count: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        WitnessesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: {
            sendTransactionWitnessInvite: jest.fn(),
            sendContactNotification: jest
              .fn()
              .mockResolvedValue({ smsSkipped: false }),
          },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn() },
        },
        {
          provide: InAppNotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
            createSafely: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(WitnessesService);
  });

  it('returns paginated witnesses with total', async () => {
    prisma.witness.findMany.mockResolvedValue([{ id: 'w1' }]);
    prisma.witness.count.mockResolvedValue(1);

    const result = await service.findMyRequests('user-1', {
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// acknowledge()
// ---------------------------------------------------------------------------

describe('WitnessesService — acknowledge()', () => {
  let service: WitnessesService;
  let prisma: {
    witness: {
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    transactionHistory: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let notificationService: { sendContactNotification: jest.Mock };
  let inAppNotificationsService: { create: jest.Mock; createSafely: jest.Mock };

  beforeEach(async () => {
    prisma = {
      witness: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      transactionHistory: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };

    notificationService = {
      sendContactNotification: jest
        .fn()
        .mockResolvedValue({ smsSkipped: false }),
    };

    inAppNotificationsService = {
      create: jest.fn().mockResolvedValue({}),
      createSafely: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        WitnessesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: {
            sendTransactionWitnessInvite: jest.fn(),
            ...notificationService,
          },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn() },
        },
        {
          provide: InAppNotificationsService,
          useValue: inAppNotificationsService,
        },
      ],
    }).compile();

    service = module.get(WitnessesService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates an in-app notification for the transaction creator on ACKNOWLEDGED', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(makeUpdatedWitness());
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0);

    await service.acknowledge(
      'witness-1',
      WitnessStatus.ACKNOWLEDGED,
      'user-1',
    );

    expect(inAppNotificationsService.createSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'creator-1',
        type: NotificationType.WITNESS_ACKNOWLEDGED,
        link: '/transactions/tx-1',
      }),
      expect.any(String),
    );
  });

  it('creates an in-app notification for the transaction creator on DECLINED', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        status: WitnessStatus.DECLINED,
        acknowledgedAt: null,
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});

    await service.acknowledge('witness-1', WitnessStatus.DECLINED, 'user-1');

    expect(inAppNotificationsService.createSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'creator-1',
        type: NotificationType.WITNESS_DECLINED,
        link: '/transactions/tx-1',
      }),
      expect.any(String),
    );
  });

  it('rejects a status other than ACKNOWLEDGED or DECLINED before writing anything or notifying', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());

    await expect(
      service.acknowledge('witness-1', WitnessStatus.MODIFIED, 'user-1'),
    ).rejects.toThrow('status must be either ACKNOWLEDGED or DECLINED');

    expect(prisma.witness.update).not.toHaveBeenCalled();
    expect(inAppNotificationsService.createSafely).not.toHaveBeenCalled();
  });

  it('sends contact notification on first ACKNOWLEDGED witness for LOAN_GIVEN transaction with phone', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(makeUpdatedWitness());
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0); // first acknowledgment

    await service.acknowledge(
      'witness-1',
      WitnessStatus.ACKNOWLEDGED,
      'user-1',
    );

    expect(notificationService.sendContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'LOAN_GIVEN',
        witnessDisplayName: 'Alhaji Sule',
        creatorDisplayName: 'Musa Ibrahim',
        contactPhoneNumber: '+2348012345678',
      }),
    );
  });

  it('does not send contact notification when a previous ACKNOWLEDGED witness exists', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(makeUpdatedWitness());
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(1); // already acknowledged by someone else

    await service.acknowledge(
      'witness-1',
      WitnessStatus.ACKNOWLEDGED,
      'user-1',
    );

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it('does not send contact notification when status is DECLINED', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        status: WitnessStatus.DECLINED,
        acknowledgedAt: null,
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});

    await service.acknowledge('witness-1', WitnessStatus.DECLINED, 'user-1');

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it('does not send contact notification when contact has no phone or email', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        transaction: {
          id: 'tx-1',
          type: TransactionType.LOAN_GIVEN,
          amount: { toNumber: () => 50000 },
          currency: 'NGN',
          createdById: 'creator-1',
          createdBy: { firstName: 'Musa', lastName: 'Ibrahim' },
          contact: {
            firstName: 'Aminu',
            lastName: 'Bello',
            phoneNumber: null,
            email: null,
          },
        },
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0);

    await service.acknowledge(
      'witness-1',
      WitnessStatus.ACKNOWLEDGED,
      'user-1',
    );

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it('does not send contact notification for GIFT_GIVEN transaction type', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        transaction: {
          id: 'tx-1',
          type: TransactionType.GIFT_GIVEN,
          amount: { toNumber: () => 5000 },
          currency: 'NGN',
          createdById: 'creator-1',
          createdBy: { firstName: 'Musa', lastName: 'Ibrahim' },
          contact: {
            firstName: 'Aminu',
            lastName: 'Bello',
            phoneNumber: '+2348012345678',
            email: null,
          },
        },
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0);

    await service.acknowledge(
      'witness-1',
      WitnessStatus.ACKNOWLEDGED,
      'user-1',
    );

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it('does not send contact notification when transaction has no contact', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        transaction: {
          id: 'tx-1',
          type: TransactionType.LOAN_GIVEN,
          amount: { toNumber: () => 50000 },
          currency: 'NGN',
          createdById: 'creator-1',
          createdBy: { firstName: 'Musa', lastName: 'Ibrahim' },
          contact: null,
        },
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0);

    await service.acknowledge(
      'witness-1',
      WitnessStatus.ACKNOWLEDGED,
      'user-1',
    );

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it('sends notification via email path when contact has email but no phone', async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        transaction: {
          id: 'tx-1',
          type: TransactionType.LOAN_RECEIVED,
          amount: { toNumber: () => 20000 },
          currency: 'NGN',
          createdById: 'creator-1',
          createdBy: { firstName: 'Musa', lastName: 'Ibrahim' },
          contact: {
            firstName: 'Aminu',
            lastName: 'Bello',
            phoneNumber: null,
            email: 'aminu@example.com',
          },
        },
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0);

    await service.acknowledge(
      'witness-1',
      WitnessStatus.ACKNOWLEDGED,
      'user-1',
    );

    expect(notificationService.sendContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'LOAN_RECEIVED',
        contactEmail: 'aminu@example.com',
        contactPhoneNumber: null,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// processWitnesses() / notifyWitnesses() — invite creation
//
// Moved here from TransactionsService (Phase 4 of the transactions.service.ts
// split, see .claude/plans/crispy-brewing-swan.md): invite creation now lives
// alongside the rest of the witness lifecycle (acknowledge/resend/remove)
// instead of split across two modules.
// ---------------------------------------------------------------------------

describe('WitnessesService — processWitnesses()', () => {
  let service: WitnessesService;
  let prisma: {
    transaction: { findUnique: jest.Mock };
    witness: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    user: { findUnique: jest.Mock; create: jest.Mock };
  };

  const baseTransaction = {
    id: 'tx-1',
    createdById: 'creator-1',
    amount: { toString: () => '50000' },
    itemName: null,
    currency: 'NGN',
    description: null,
    quantity: null,
    category: AssetCategory.FUNDS,
    type: TransactionType.LOAN_GIVEN,
    date: null,
    createdBy: { firstName: 'Musa', lastName: 'Ibrahim' },
    contact: { firstName: 'Aminu', lastName: 'Bello' },
  };

  beforeEach(async () => {
    prisma = {
      transaction: { findUnique: jest.fn() },
      witness: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: { findUnique: jest.fn(), create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        WitnessesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { sendTransactionWitnessInvite: jest.fn() },
        },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn() } },
        {
          provide: InAppNotificationsService,
          useValue: { createSafely: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(WitnessesService);
  });

  it('returns an empty array when the transaction is not found', async () => {
    prisma.transaction.findUnique.mockResolvedValue(null);

    const result = await service.processWitnesses(
      'missing-tx',
      ['user-1'],
      undefined,
      prisma as never,
    );

    expect(result).toEqual([]);
    expect(prisma.witness.upsert).not.toHaveBeenCalled();
  });

  it('upserts a witness record for an existing user id and builds its notification payload', async () => {
    prisma.transaction.findUnique.mockResolvedValue(baseTransaction);
    prisma.witness.upsert.mockResolvedValue({
      id: 'witness-1',
      userId: 'witness-user-1',
      user: {
        email: 'aminu@example.com',
        firstName: 'Aminu',
        lastName: 'Bello',
        phoneNumber: '+2348012345678',
      },
    });

    const [notification] = await service.processWitnesses(
      'tx-1',
      ['witness-user-1'],
      undefined,
      prisma as never,
    );

    expect(prisma.witness.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          transactionId_userId: {
            transactionId: 'tx-1',
            userId: 'witness-user-1',
          },
        },
      }),
    );
    expect(notification).toMatchObject({
      witnessId: 'witness-1',
      userId: 'witness-user-1',
      email: 'aminu@example.com',
      firstName: 'Aminu',
      senderId: 'creator-1',
      phoneNumber: '+2348012345678',
    });
    expect(notification.transactionDetails).toMatchObject({
      creatorName: 'Musa Ibrahim',
      contactName: 'Aminu Bello',
    });
  });

  it('creates a placeholder user and witness record for a new invite with no existing account', async () => {
    prisma.transaction.findUnique.mockResolvedValue(baseTransaction);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'new-user-1',
      email: 'newwitness@example.com',
      firstName: 'Bello',
    });
    prisma.witness.findUnique.mockResolvedValue(null);
    prisma.witness.create.mockResolvedValue({ id: 'witness-2' });

    const [notification] = await service.processWitnesses(
      'tx-1',
      undefined,
      [{ email: 'NewWitness@Example.com', name: 'Bello Sani' }] as never,
      prisma as never,
    );

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'newwitness@example.com',
          passwordHash: null,
        }),
      }),
    );
    expect(notification).toMatchObject({
      witnessId: 'witness-2',
      userId: 'new-user-1',
      email: 'newwitness@example.com',
    });
  });

  it('reuses an existing user and witness record for a repeat invite by email', async () => {
    prisma.transaction.findUnique.mockResolvedValue(baseTransaction);
    prisma.user.findUnique.mockResolvedValue({
      id: 'existing-user-1',
      email: 'aminu@example.com',
      firstName: 'Aminu',
      phoneNumber: null,
    });
    prisma.witness.findUnique.mockResolvedValue({ id: 'witness-3' });

    const [notification] = await service.processWitnesses(
      'tx-1',
      undefined,
      [{ email: 'aminu@example.com', name: 'Aminu' }] as never,
      prisma as never,
    );

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.witness.create).not.toHaveBeenCalled();
    expect(notification).toMatchObject({
      witnessId: 'witness-3',
      userId: 'existing-user-1',
    });
  });
});

describe('WitnessesService — notifyWitnesses()', () => {
  let service: WitnessesService;
  let cacheManager: { set: jest.Mock };
  let notificationService: { sendTransactionWitnessInvite: jest.Mock };
  let inAppNotificationsService: { createSafely: jest.Mock };

  beforeEach(async () => {
    cacheManager = { set: jest.fn() };
    notificationService = {
      sendTransactionWitnessInvite: jest.fn().mockResolvedValue(undefined),
    };
    inAppNotificationsService = { createSafely: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        WitnessesService,
        { provide: PrismaService, useValue: {} },
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('7d') },
        },
        {
          provide: InAppNotificationsService,
          useValue: inAppNotificationsService,
        },
      ],
    }).compile();

    service = module.get(WitnessesService);
  });

  it('stores the hashed invite token, sends the invite, and fires an in-app notification', async () => {
    await service.notifyWitnesses([
      {
        witnessId: 'witness-1',
        userId: 'witness-user-1',
        email: 'aminu@example.com',
        firstName: 'Aminu',
        rawToken: 'raw-token-123',
        senderId: 'creator-1',
        phoneNumber: '+2348012345678',
        transactionDetails: {
          creatorName: 'Musa Ibrahim',
          contactName: 'Aminu Bello',
          amount: '50000',
          category: AssetCategory.FUNDS,
          type: TransactionType.LOAN_GIVEN,
        },
      },
    ]);

    expect(cacheManager.set).toHaveBeenCalledWith(
      expect.stringMatching(/^invite:/),
      'witness-1',
      expect.any(Number),
    );
    expect(
      notificationService.sendTransactionWitnessInvite,
    ).toHaveBeenCalledWith(
      'aminu@example.com',
      'Aminu',
      'raw-token-123',
      expect.objectContaining({ creatorName: 'Musa Ibrahim' }),
      'creator-1',
      '+2348012345678',
    );
    expect(inAppNotificationsService.createSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'witness-user-1',
        type: NotificationType.WITNESS_INVITED,
      }),
      expect.any(String),
    );
  });

  it('processes every notification in the batch', async () => {
    await service.notifyWitnesses([
      {
        witnessId: 'witness-1',
        userId: 'user-a',
        email: 'a@example.com',
        firstName: 'A',
        rawToken: 'token-a',
        senderId: 'creator-1',
        transactionDetails: {
          creatorName: 'Musa Ibrahim',
          contactName: 'N/A',
          amount: '1000',
          category: AssetCategory.FUNDS,
          type: TransactionType.LOAN_GIVEN,
        },
      },
      {
        witnessId: 'witness-2',
        userId: 'user-b',
        email: 'b@example.com',
        firstName: 'B',
        rawToken: 'token-b',
        senderId: 'creator-1',
        transactionDetails: {
          creatorName: 'Musa Ibrahim',
          contactName: 'N/A',
          amount: '2000',
          category: AssetCategory.FUNDS,
          type: TransactionType.LOAN_GIVEN,
        },
      },
    ]);

    expect(cacheManager.set).toHaveBeenCalledTimes(2);
    expect(
      notificationService.sendTransactionWitnessInvite,
    ).toHaveBeenCalledTimes(2);
  });
});
