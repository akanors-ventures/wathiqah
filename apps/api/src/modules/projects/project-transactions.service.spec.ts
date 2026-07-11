import { Test } from '@nestjs/testing';
import { ProjectTransactionsService } from './project-transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

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
