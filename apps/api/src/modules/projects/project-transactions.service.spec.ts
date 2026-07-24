import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProjectTransactionsService } from './project-transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { ProjectTransactionType } from '../../generated/prisma/client';

describe('ProjectTransactionsService — remove', () => {
  let service: ProjectTransactionsService;
  let prisma: {
    projectTransaction: { findUnique: jest.Mock; delete: jest.Mock };
    project: { update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      projectTransaction: { findUnique: jest.fn(), delete: jest.fn() },
      project: { update: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((cb) => cb(prisma));

    const module = await Test.createTestingModule({
      providers: [
        ProjectTransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();
    service = module.get(ProjectTransactionsService);
  });

  it('throws NotFoundException when the transaction does not exist', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue(null);

    await expect(service.remove('user1', 'missing-tx')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when the caller is not the project owner', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'tx1',
      amount: 100,
      type: ProjectTransactionType.INCOME,
      projectId: 'proj1',
      project: { userId: 'someone-else' },
      witnesses: [],
    });

    await expect(service.remove('user1', 'tx1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws BadRequestException when the transaction is a passive mirror synced from a contact-originated link', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'tx1',
      amount: 100,
      type: ProjectTransactionType.INCOME,
      projectId: 'proj1',
      project: { userId: 'user1' },
      witnesses: [],
      isMirroredFromContact: true,
    });

    await expect(service.remove('user1', 'tx1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.projectTransaction.delete).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException and does not delete when the transaction has witnesses', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'tx1',
      amount: 100,
      type: ProjectTransactionType.INCOME,
      projectId: 'proj1',
      project: { userId: 'user1' },
      witnesses: [{ id: 'witness1' }],
    });

    await expect(service.remove('user1', 'tx1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.projectTransaction.delete).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('deletes the transaction and decrements project balance for an INCOME transaction', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'tx1',
      amount: 100,
      type: ProjectTransactionType.INCOME,
      projectId: 'proj1',
      project: { userId: 'user1' },
      witnesses: [],
    });
    prisma.projectTransaction.delete.mockResolvedValue({ id: 'tx1' });

    const result = await service.remove('user1', 'tx1');

    expect(prisma.projectTransaction.delete).toHaveBeenCalledWith({
      where: { id: 'tx1' },
    });
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'proj1' },
      data: { balance: { decrement: 100 } },
    });
    expect(result).toEqual({ id: 'tx1' });
  });

  it('deletes the transaction and increments project balance back for an EXPENSE transaction', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'tx2',
      amount: 50,
      type: ProjectTransactionType.EXPENSE,
      projectId: 'proj1',
      project: { userId: 'user1' },
      witnesses: [],
    });
    prisma.projectTransaction.delete.mockResolvedValue({ id: 'tx2' });

    await service.remove('user1', 'tx2');

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'proj1' },
      data: { balance: { decrement: -50 } },
    });
  });
});

describe('ProjectTransactionsService — updateWithClient', () => {
  let service: ProjectTransactionsService;
  let prisma: {
    projectTransaction: { findUnique: jest.Mock; update: jest.Mock };
    project: { update: jest.Mock };
    projectTransactionHistory: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      projectTransaction: { findUnique: jest.fn(), update: jest.fn() },
      project: { update: jest.fn() },
      projectTransactionHistory: { create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        ProjectTransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();
    service = module.get(ProjectTransactionsService);
  });

  it('rejects editing a passive mirror synced from a contact-originated link', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      amount: 100,
      type: ProjectTransactionType.INCOME,
      projectId: 'proj1',
      project: { userId: 'user1' },
      isMirroredFromContact: true,
    });

    await expect(
      service.updateWithClient(prisma as never, 'user1', {
        id: 'pt1',
        amount: 200,
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.projectTransaction.update).not.toHaveBeenCalled();
  });

  it('allows editing a ProjectTransaction that is itself the origin of a contact link', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      amount: 100,
      type: ProjectTransactionType.INCOME,
      projectId: 'proj1',
      project: { userId: 'user1' },
      isMirroredFromContact: false,
      contactId: 'contact-1',
    });
    prisma.projectTransaction.update.mockResolvedValue({ id: 'pt1' });

    await expect(
      service.updateWithClient(prisma as never, 'user1', {
        id: 'pt1',
        amount: 200,
      } as never),
    ).resolves.toBeDefined();
  });
});

describe('ProjectTransactionsService — syncMirroredAmount', () => {
  let service: ProjectTransactionsService;
  let prisma: {
    projectTransaction: { findUnique: jest.Mock; update: jest.Mock };
    project: { update: jest.Mock };
    projectTransactionHistory: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      projectTransaction: { findUnique: jest.fn(), update: jest.fn() },
      project: { update: jest.fn() },
      projectTransactionHistory: { create: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        ProjectTransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();
    service = module.get(ProjectTransactionsService);
  });

  it('rejects operating on a ProjectTransaction that is not itself a contact-originated mirror (defense in depth)', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      type: ProjectTransactionType.INCOME,
      amount: 100,
      projectId: 'proj1',
      isMirroredFromContact: false,
    });

    await expect(
      service.syncMirroredAmount(prisma as never, 'pt1', 200, 'user1'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.projectTransaction.update).not.toHaveBeenCalled();
  });

  it('rejects a zero/negative amount', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      type: ProjectTransactionType.INCOME,
      amount: 100,
      projectId: 'proj1',
      isMirroredFromContact: true,
    });

    await expect(
      service.syncMirroredAmount(prisma as never, 'pt1', 0, 'user1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.projectTransaction.update).not.toHaveBeenCalled();
  });

  it('no-ops when the new amount equals the current amount', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      type: ProjectTransactionType.INCOME,
      amount: 100,
      projectId: 'proj1',
      isMirroredFromContact: true,
    });

    await service.syncMirroredAmount(prisma as never, 'pt1', 100, 'user1');

    expect(prisma.projectTransaction.update).not.toHaveBeenCalled();
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('updates the amount and adjusts project.balance by the correct signed delta for an INCOME mirror', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      type: ProjectTransactionType.INCOME,
      amount: 100,
      projectId: 'proj1',
      isMirroredFromContact: true,
    });

    await service.syncMirroredAmount(prisma as never, 'pt1', 250, 'user1');

    expect(prisma.projectTransaction.update).toHaveBeenCalledWith({
      where: { id: 'pt1' },
      data: { amount: 250 },
    });
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'proj1' },
      data: { balance: { increment: 150 } },
    });
  });

  it('updates the amount and adjusts project.balance by the correct signed delta for an EXPENSE mirror', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'pt1',
      type: ProjectTransactionType.EXPENSE,
      amount: 100,
      projectId: 'proj1',
      isMirroredFromContact: true,
    });

    await service.syncMirroredAmount(prisma as never, 'pt1', 250, 'user1');

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'proj1' },
      data: { balance: { increment: -150 } },
    });
  });
});

describe('ProjectTransactionsService — usedCategories', () => {
  let service: ProjectTransactionsService;
  let prisma: {
    projectTransaction: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      projectTransaction: { findMany: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        ProjectTransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();
    service = module.get(ProjectTransactionsService);
  });

  it('returns distinct categories used within the project, scoped to the caller as owner in a single query', async () => {
    prisma.projectTransaction.findMany.mockResolvedValue([
      { category: 'Labor' },
      { category: 'Materials' },
    ]);

    const result = await service.usedCategories('user1', 'proj1');

    expect(prisma.projectTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'proj1',
          category: { not: null },
          project: { userId: 'user1' },
        },
        distinct: ['category'],
      }),
    );
    expect(result).toEqual(['Labor', 'Materials']);
  });

  it('returns an empty array when the project does not exist', async () => {
    prisma.projectTransaction.findMany.mockResolvedValue([]);

    const result = await service.usedCategories('user1', 'missing-proj');

    expect(result).toEqual([]);
  });

  it('returns an empty array when the caller does not own the project', async () => {
    // The `project: { userId }` relation filter excludes rows belonging to a
    // project owned by someone else, so Prisma itself returns no rows —
    // there's nothing for the caller to distinguish from "no categories yet".
    prisma.projectTransaction.findMany.mockResolvedValue([]);

    const result = await service.usedCategories('user1', 'someone-elses-proj');

    expect(result).toEqual([]);
    expect(prisma.projectTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ project: { userId: 'user1' } }),
      }),
    );
  });
});
