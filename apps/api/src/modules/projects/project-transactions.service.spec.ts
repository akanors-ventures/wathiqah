import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectTransactionsService } from './project-transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

describe('ProjectTransactionsService — usedCategories', () => {
  let service: ProjectTransactionsService;
  let prisma: {
    project: { findUnique: jest.Mock };
    projectTransaction: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      project: { findUnique: jest.fn() },
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

  it('returns distinct categories used within the project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj1',
      userId: 'user1',
    });
    prisma.projectTransaction.findMany.mockResolvedValue([
      { category: 'Labor' },
      { category: 'Materials' },
    ]);

    const result = await service.usedCategories('user1', 'proj1');

    expect(prisma.projectTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'proj1', category: { not: null } },
        distinct: ['category'],
      }),
    );
    expect(result).toEqual(['Labor', 'Materials']);
  });

  it('throws NotFoundException when the project does not exist', async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(
      service.usedCategories('user1', 'missing-proj'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.projectTransaction.findMany).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the caller does not own the project', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'proj1',
      userId: 'other-user',
    });

    await expect(service.usedCategories('user1', 'proj1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.projectTransaction.findMany).not.toHaveBeenCalled();
  });
});
