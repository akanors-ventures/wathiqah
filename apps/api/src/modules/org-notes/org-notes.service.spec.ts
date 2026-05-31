import { Test } from '@nestjs/testing';
import { OrgNotesService } from './org-notes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('OrgNotesService', () => {
  let service: OrgNotesService;
  let prisma: {
    orgNote: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      orgNote: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        OrgNotesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OrgNotesService);
  });

  it('creates a note scoped to the org', async () => {
    prisma.orgNote.create.mockResolvedValue({ id: 'n1', orgId: 'org1' });

    const result = await service.create(
      { body: 'Daily rounds: all livestock healthy', category: 'Operations' },
      'org1',
      'user1',
    );

    expect(prisma.orgNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgId: 'org1', createdById: 'user1' }),
      }),
    );
    expect(result.orgId).toBe('org1');
  });

  it('returns notes sorted by createdAt descending (reverse chron)', async () => {
    await service.findAll('org1');
    expect(prisma.orgNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('throws ForbiddenException when deleting another orgs note', async () => {
    prisma.orgNote.findUnique.mockResolvedValue({
      id: 'n1',
      orgId: 'other-org',
    });
    await expect(service.remove('n1', 'org1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when note does not exist', async () => {
    prisma.orgNote.findUnique.mockResolvedValue(null);
    await expect(service.remove('n1', 'org1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
