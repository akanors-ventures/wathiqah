import { Test } from '@nestjs/testing';
import { UserNotesService } from './user-notes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UserNotesService', () => {
  let service: UserNotesService;
  let prisma: {
    userNote: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      userNote: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        UserNotesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(UserNotesService);
  });

  it('creates a note scoped to the user', async () => {
    prisma.userNote.create.mockResolvedValue({ id: 'n1', userId: 'user1' });

    const result = await service.create(
      {
        title: 'First contract',
        body: 'I signed my first contract today',
        category: 'milestones',
      },
      'user1',
    );

    expect(prisma.userNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user1',
          title: 'First contract',
        }),
      }),
    );
    expect(result.userId).toBe('user1');
  });

  it('returns notes sorted by createdAt descending', async () => {
    await service.findAll('user1');
    expect(prisma.userNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('filters by category when provided', async () => {
    await service.findAll('user1', 'milestones');
    expect(prisma.userNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user1', category: 'milestones' },
      }),
    );
  });

  it('throws ForbiddenException when deleting another users note', async () => {
    prisma.userNote.findUnique.mockResolvedValue({
      id: 'n1',
      userId: 'other-user',
    });
    await expect(service.remove('n1', 'user1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when note does not exist', async () => {
    prisma.userNote.findUnique.mockResolvedValue(null);
    await expect(service.remove('n1', 'user1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
