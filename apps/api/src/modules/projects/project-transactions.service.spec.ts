import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
    });

    await expect(service.remove('user1', 'tx1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deletes the transaction and decrements project balance for an INCOME transaction', async () => {
    prisma.projectTransaction.findUnique.mockResolvedValue({
      id: 'tx1',
      amount: 100,
      type: ProjectTransactionType.INCOME,
      projectId: 'proj1',
      project: { userId: 'user1' },
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
    });
    prisma.projectTransaction.delete.mockResolvedValue({ id: 'tx2' });

    await service.remove('user1', 'tx2');

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'proj1' },
      data: { balance: { decrement: -50 } },
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
