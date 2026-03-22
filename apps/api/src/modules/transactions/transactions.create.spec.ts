import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationService } from '../notifications/notification.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import {
  TransactionType,
  AssetCategory,
} from '../../generated/prisma/client';

const CREATOR_ID = 'creator-1';
const CONTACT_ID = 'contact-1';

const mockContact = {
  id: CONTACT_ID,
  userId: CREATOR_ID,
  firstName: 'Aminu',
  lastName: 'Musa',
  phoneNumber: '+2348099999999',
  email: 'aminu@example.com',
  linkedUserId: null,
  createdAt: new Date(),
};

const mockCreator = {
  id: CREATOR_ID,
  firstName: 'Fatima',
  lastName: 'Bello',
  email: 'fatima@example.com',
};

const mockTransaction = {
  id: 'tx-1',
  createdById: CREATOR_ID,
  contactId: CONTACT_ID,
  type: TransactionType.GIVEN,
  category: AssetCategory.FUNDS,
  amount: { toNumber: () => 5000 } as any,
  currency: 'NGN',
  status: 'PENDING' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  description: null,
  itemName: null,
  quantity: null,
  returnDirection: null,
  parentId: null,
  dueDate: null,
};

const mockPrismaService = {
  transaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  contact: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  transactionHistory: {
    create: jest.fn(),
  },
  witness: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrismaService)),
};

const mockNotificationService = {
  sendTransactionWitnessInvite: jest.fn(),
  sendWitnessUpdateNotification: jest.fn(),
  sendContactNotification: jest.fn().mockResolvedValue({ smsSkipped: false }),
};

const mockConfigService = { getOrThrow: jest.fn(), get: jest.fn() };
const mockCacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const mockExchangeRateService = { convert: jest.fn((v: number) => Promise.resolve(v)) };

describe('TransactionsService - create() contact notification', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ExchangeRateService, useValue: mockExchangeRateService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();

    mockPrismaService.contact.findUnique.mockResolvedValue(mockContact);
    mockPrismaService.user.findUnique.mockResolvedValue(mockCreator);
    mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);
    mockNotificationService.sendContactNotification.mockResolvedValue({ smsSkipped: false });
  });

  const TX_DATE = new Date('2026-03-22');

  it('sends contact notification for a GIVEN transaction and returns smsSkipped', async () => {
    const result = await service.create(
      {
        type: TransactionType.GIVEN,
        category: AssetCategory.FUNDS,
        amount: 5000,
        currency: 'NGN',
        contactId: CONTACT_ID,
        date: TX_DATE,
      },
      CREATOR_ID,
    );

    expect(mockNotificationService.sendContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: mockTransaction.id,
        contactPhoneNumber: mockContact.phoneNumber,
        contactEmail: mockContact.email,
        contactFirstName: mockContact.firstName,
        creatorId: CREATOR_ID,
        creatorDisplayName: mockCreator.firstName,
        amount: 5000,
        currency: 'NGN',
      }),
    );
    expect(result.smsSkipped).toBe(false);
  });

  it('sends contact notification for a RECEIVED transaction', async () => {
    mockPrismaService.transaction.create.mockResolvedValue({
      ...mockTransaction,
      type: TransactionType.RECEIVED,
    });

    await service.create(
      {
        type: TransactionType.RECEIVED,
        category: AssetCategory.FUNDS,
        amount: 3000,
        currency: 'NGN',
        contactId: CONTACT_ID,
        date: TX_DATE,
      },
      CREATOR_ID,
    );

    expect(mockNotificationService.sendContactNotification).toHaveBeenCalled();
  });

  it('sends contact notification for a RETURNED transaction', async () => {
    mockPrismaService.transaction.create.mockResolvedValue({
      ...mockTransaction,
      type: TransactionType.RETURNED,
    });

    await service.create(
      {
        type: TransactionType.RETURNED,
        category: AssetCategory.FUNDS,
        amount: 2000,
        currency: 'NGN',
        contactId: CONTACT_ID,
        date: TX_DATE,
      },
      CREATOR_ID,
    );

    expect(mockNotificationService.sendContactNotification).toHaveBeenCalled();
  });

  it('does NOT send contact notification for a GIFT transaction', async () => {
    mockPrismaService.transaction.create.mockResolvedValue({
      ...mockTransaction,
      type: TransactionType.GIFT,
      amount: null,
      contactId: null,
    });

    await service.create(
      {
        type: TransactionType.GIFT,
        category: AssetCategory.FUNDS,
        amount: 1000,
        currency: 'NGN',
        date: TX_DATE,
      },
      CREATOR_ID,
    );

    expect(mockNotificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it('does NOT send contact notification when no contactId is set', async () => {
    mockPrismaService.transaction.create.mockResolvedValue({
      ...mockTransaction,
      contactId: null,
    });

    await service.create(
      {
        type: TransactionType.GIVEN,
        category: AssetCategory.FUNDS,
        amount: 5000,
        currency: 'NGN',
        date: TX_DATE,
      },
      CREATOR_ID,
    );

    expect(mockNotificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it('returns smsSkipped: true when notification service reports limit hit', async () => {
    mockNotificationService.sendContactNotification.mockResolvedValue({ smsSkipped: true });

    const result = await service.create(
      {
        type: TransactionType.GIVEN,
        category: AssetCategory.FUNDS,
        amount: 5000,
        currency: 'NGN',
        contactId: CONTACT_ID,
        date: TX_DATE,
      },
      CREATOR_ID,
    );

    expect(result.smsSkipped).toBe(true);
  });

  it('uses creator email as display name when firstName is absent', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      ...mockCreator,
      firstName: null,
    });

    await service.create(
      {
        type: TransactionType.GIVEN,
        category: AssetCategory.FUNDS,
        amount: 5000,
        currency: 'NGN',
        contactId: CONTACT_ID,
        date: TX_DATE,
      },
      CREATOR_ID,
    );

    expect(mockNotificationService.sendContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorDisplayName: mockCreator.email,
      }),
    );
  });
});
