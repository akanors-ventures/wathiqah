import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationService } from '../notifications/notification.service';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service';
import {
  TransactionStatus,
  TransactionType,
} from '../../generated/prisma/client';

const USER_ID = 'user-1';
const TX_ID = 'tx-1';

const baseTransaction = {
  id: TX_ID,
  createdById: USER_ID,
  contactId: 'contact-1',
  type: TransactionType.LOAN_GIVEN,
  status: TransactionStatus.PENDING,
  amount: 1000,
  currency: 'NGN',
  parentId: null,
  projectTransactionId: null,
  isMirroredFromProject: false,
  contact: { linkedUserId: null },
  witnesses: [],
  history: [],
  conversions: [],
};

const mockPrismaService = {
  transaction: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  projectTransaction: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  project: { update: jest.fn() },
  transactionHistory: { create: jest.fn() },
  witness: { updateMany: jest.fn() },
  user: { findUnique: jest.fn() },
  $transaction: jest.fn((fn) => fn(mockPrismaService)),
};

const mockNotificationService = {
  sendTransactionWitnessInvite: jest.fn(),
  sendWitnessUpdateNotification: jest.fn(),
};

describe('TransactionsService — project-mirror guards', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn(), get: jest.fn() },
        },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ExchangeRateService, useValue: {} },
        {
          provide: InAppNotificationsService,
          useValue: { createSafely: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(TransactionsService);
    jest.clearAllMocks();
  });

  const mirroredTransaction = {
    ...baseTransaction,
    isMirroredFromProject: true,
    projectTransactionId: 'pt-1',
  };

  describe('update()', () => {
    it('rejects editing a passive project mirror', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mirroredTransaction,
      );

      await expect(
        service.update(TX_ID, { id: TX_ID, description: 'changed' }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows editing a transaction that is itself the origin of a project link', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...baseTransaction,
        projectTransactionId: 'pt-1',
        isMirroredFromProject: false,
      });
      mockPrismaService.transaction.update.mockResolvedValue({
        ...baseTransaction,
      });

      await expect(
        service.update(TX_ID, { id: TX_ID, description: 'changed' }, USER_ID),
      ).resolves.toBeDefined();
    });
  });

  describe('remove()', () => {
    it('rejects deleting a passive project mirror', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mirroredTransaction,
      );

      await expect(service.remove(TX_ID, USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('soft-cancels a witnessed, project-linked transaction without touching its still-referenced ProjectTransaction mirror, but reverses its project.balance contribution', async () => {
      // Regression test: Transaction.projectTransactionId has onDelete: Restrict,
      // so deleting the mirror while this (soft-cancelled, not deleted) row still
      // references it would previously throw a FK-constraint error. Separately,
      // project.balance must stop counting a cancelled entry — computeNetBalance
      // already excludes CANCELLED transactions on the contact side, so the
      // linked project side needs the same exclusion.
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...baseTransaction,
        projectTransactionId: 'pt-1',
        isMirroredFromProject: false,
        witnesses: [{ id: 'w1', status: 'PENDING', user: {} }],
      });
      mockPrismaService.transaction.update.mockResolvedValue({
        ...baseTransaction,
        status: TransactionStatus.CANCELLED,
      });
      mockPrismaService.projectTransaction.findUnique.mockResolvedValue({
        id: 'pt-1',
        type: 'INCOME',
        amount: 250,
        projectId: 'proj-1',
      });

      await expect(service.remove(TX_ID, USER_ID)).resolves.toBeDefined();

      expect(
        mockPrismaService.projectTransaction.delete,
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: TX_ID },
        data: { status: TransactionStatus.CANCELLED },
      });
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { balance: { decrement: 250 } },
      });
    });

    it('hard-deletes a project-linked transaction (no witnesses) and cleans up its mirror, since the referencing row is gone by then', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...baseTransaction,
        projectTransactionId: 'pt-1',
        isMirroredFromProject: false,
        witnesses: [],
      });
      mockPrismaService.transaction.delete.mockResolvedValue({ id: TX_ID });
      mockPrismaService.projectTransaction.findUnique.mockResolvedValue({
        id: 'pt-1',
        type: 'EXPENSE',
        amount: 100,
        projectId: 'proj-1',
        witnesses: [],
        isMirroredFromContact: true,
      });

      await service.remove(TX_ID, USER_ID);

      expect(mockPrismaService.transaction.delete).toHaveBeenCalledWith({
        where: { id: TX_ID },
      });
      expect(mockPrismaService.projectTransaction.delete).toHaveBeenCalledWith({
        where: { id: 'pt-1' },
      });
    });

    it('refuses to delete a linked ProjectTransaction that is not itself a contact-originated mirror (defense in depth)', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...baseTransaction,
        projectTransactionId: 'pt-1',
        isMirroredFromProject: false,
        witnesses: [],
      });
      mockPrismaService.projectTransaction.findUnique.mockResolvedValue({
        id: 'pt-1',
        type: 'EXPENSE',
        amount: 100,
        projectId: 'proj-1',
        witnesses: [],
        isMirroredFromContact: false,
      });

      // The mocked $transaction doesn't emulate real rollback semantics, so
      // transaction.delete (called before this guard trips) still shows as
      // invoked on the mock — the guarantee this test actually verifies is
      // that the guard fires and the mirror is never deleted.
      await expect(service.remove(TX_ID, USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        mockPrismaService.projectTransaction.delete,
      ).not.toHaveBeenCalled();
    });
  });

  describe('addWitness()', () => {
    it('rejects adding a witness to a passive project mirror', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mirroredTransaction,
      );

      await expect(
        service.addWitness(
          { transactionId: TX_ID, witnessUserIds: ['w1'] },
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('syncMirroredAmount()', () => {
    it('rejects a zero/negative amount', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...baseTransaction,
        isMirroredFromProject: true,
      });

      await expect(
        service.syncMirroredAmount(
          mockPrismaService as never,
          TX_ID,
          0,
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.transaction.update).not.toHaveBeenCalled();
    });

    it('rejects operating on a transaction that is not itself a project-originated mirror (defense in depth)', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...baseTransaction,
        isMirroredFromProject: false,
      });

      await expect(
        service.syncMirroredAmount(
          mockPrismaService as never,
          TX_ID,
          500,
          USER_ID,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.transaction.update).not.toHaveBeenCalled();
    });

    it('no-ops when the new amount equals the current amount, mirroring ProjectTransactionsService.syncMirroredAmount', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...baseTransaction,
        isMirroredFromProject: true,
        amount: 1000,
      });

      await service.syncMirroredAmount(
        mockPrismaService as never,
        TX_ID,
        1000,
        USER_ID,
      );

      expect(mockPrismaService.transaction.update).not.toHaveBeenCalled();
      expect(
        mockPrismaService.transactionHistory.create,
      ).not.toHaveBeenCalled();
    });

    it('rejects shrinking a lifecycle parent below what has already been settled against it', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...baseTransaction,
        isMirroredFromProject: true,
        type: TransactionType.LOAN_GIVEN,
        parentId: null,
      });
      mockPrismaService.transaction.findMany.mockResolvedValue([
        { amount: 600 },
      ]);

      await expect(
        service.syncMirroredAmount(
          mockPrismaService as never,
          TX_ID,
          400,
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.transaction.update).not.toHaveBeenCalled();
    });

    it('updates the amount and recomputes the parent when the mirror is itself a repayment child', async () => {
      mockPrismaService.transaction.findUnique
        .mockResolvedValueOnce({
          ...baseTransaction,
          isMirroredFromProject: true,
          type: TransactionType.REPAYMENT_MADE,
          parentId: 'parent-1',
        })
        .mockResolvedValueOnce({
          id: 'parent-1',
          amount: 1000,
          status: TransactionStatus.PENDING,
          type: TransactionType.LOAN_GIVEN,
        });
      mockPrismaService.transaction.findMany.mockResolvedValue([
        { amount: 1000 },
      ]);

      await service.syncMirroredAmount(
        mockPrismaService as never,
        TX_ID,
        500,
        USER_ID,
      );

      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: TX_ID },
        data: { amount: 500 },
      });
      // Regression test: every other amount mutation writes a
      // transactionHistory entry; a project-triggered mirrored-amount sync
      // must not be a silent exception to that invariant.
      expect(mockPrismaService.transactionHistory.create).toHaveBeenCalledWith({
        data: {
          transactionId: TX_ID,
          userId: USER_ID,
          changeType: 'UPDATE',
          previousState: { amount: baseTransaction.amount },
          newState: { amount: 500 },
        },
      });
    });

    it('recomputes its own settlement status when the mirror is a lifecycle parent (loan/escrow)', async () => {
      mockPrismaService.transaction.findUnique
        .mockResolvedValueOnce({
          ...baseTransaction,
          isMirroredFromProject: true,
          type: TransactionType.LOAN_GIVEN,
          parentId: null,
        })
        .mockResolvedValueOnce({
          id: TX_ID,
          amount: 500,
          status: TransactionStatus.PENDING,
          type: TransactionType.LOAN_GIVEN,
        });
      mockPrismaService.transaction.findMany.mockResolvedValue([]);

      await service.syncMirroredAmount(
        mockPrismaService as never,
        TX_ID,
        500,
        USER_ID,
      );

      expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: TX_ID } }),
      );
    });
  });

  describe('deleteMirroredTransaction()', () => {
    it('deletes the row and reopens the parent loan if it was a settlement child', async () => {
      mockPrismaService.transaction.findUnique
        .mockResolvedValueOnce({ ...baseTransaction, parentId: 'parent-1' })
        .mockResolvedValueOnce({
          id: 'parent-1',
          amount: 1000,
          status: TransactionStatus.COMPLETED,
          type: TransactionType.LOAN_GIVEN,
        });
      mockPrismaService.transaction.findMany.mockResolvedValue([]);

      await service.deleteMirroredTransaction(
        mockPrismaService as never,
        TX_ID,
        USER_ID,
      );

      expect(mockPrismaService.transaction.delete).toHaveBeenCalledWith({
        where: { id: TX_ID },
      });
      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
        data: { status: TransactionStatus.PENDING },
      });
    });

    it('no-ops safely when the mirror is already gone', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteMirroredTransaction(
          mockPrismaService as never,
          TX_ID,
          USER_ID,
        ),
      ).resolves.toBeUndefined();
      expect(mockPrismaService.transaction.delete).not.toHaveBeenCalled();
    });
  });
});
