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
