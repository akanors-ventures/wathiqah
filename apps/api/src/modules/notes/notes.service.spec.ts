import { Test } from '@nestjs/testing';
import { NotesService } from './notes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PUB_SUB } from '../../common/pubsub/pubsub.module';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('NotesService', () => {
  let service: NotesService;
  let prisma: {
    note: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let pubSub: { publish: jest.Mock };

  beforeEach(async () => {
    prisma = {
      note: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    pubSub = { publish: jest.fn().mockResolvedValue(undefined) };
    const module = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUB_SUB, useValue: pubSub },
      ],
    }).compile();
    service = module.get(NotesService);
  });

  it('creates a personal note with no orgId', async () => {
    prisma.note.create.mockResolvedValue({
      id: 'n1',
      createdById: 'user1',
      orgId: null,
    });

    const result = await service.create(
      { title: 'First contract', body: 'I signed my first contract today' },
      'user1',
    );

    expect(prisma.note.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdById: 'user1', orgId: null }),
      }),
    );
    expect(result.orgId).toBeNull();
    expect(pubSub.publish).not.toHaveBeenCalled();
  });

  it('creates an org note with orgId', async () => {
    prisma.note.create.mockResolvedValue({
      id: 'n2',
      createdById: 'user1',
      orgId: 'org1',
    });

    const result = await service.create(
      { body: 'Daily rounds: all livestock healthy', category: 'Operations' },
      'user1',
      'org1',
    );

    expect(prisma.note.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdById: 'user1', orgId: 'org1' }),
      }),
    );
    expect(result.orgId).toBe('org1');
    expect(pubSub.publish).toHaveBeenCalledWith('orgNoteCreated', {
      orgNoteCreated: result,
      orgId: 'org1',
    });
  });

  it('findByOrg returns notes sorted by createdAt descending', async () => {
    await service.findByOrg('org1');
    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });

  it('findByUser filters to personal notes only (orgId: null)', async () => {
    await service.findByUser('user1');
    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdById: 'user1', orgId: null }),
      }),
    );
  });

  it('throws ForbiddenException when deleting another users note', async () => {
    prisma.note.findUnique.mockResolvedValue({
      id: 'n1',
      createdById: 'other-user',
    });
    await expect(service.remove('n1', 'user1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when note does not exist', async () => {
    prisma.note.findUnique.mockResolvedValue(null);
    await expect(service.remove('n1', 'user1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException when updating note from another org', async () => {
    prisma.note.findUnique.mockResolvedValue({
      id: 'n1',
      orgId: 'other-org',
      createdById: 'user1',
    });
    await expect(
      service.updateOrgNote('n1', { body: 'updated' }, 'org1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when org note does not exist', async () => {
    prisma.note.findUnique.mockResolvedValue(null);
    await expect(service.removeOrgNote('n1', 'org1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('publishes orgNoteUpdated after a successful org note update', async () => {
    prisma.note.findUnique.mockResolvedValue({ id: 'n1', orgId: 'org1' });
    const updated = { id: 'n1', orgId: 'org1', body: 'updated' };
    prisma.note.update.mockResolvedValue(updated);

    await service.updateOrgNote('n1', { body: 'updated' }, 'org1');

    expect(pubSub.publish).toHaveBeenCalledWith('orgNoteUpdated', {
      orgNoteUpdated: updated,
      orgId: 'org1',
    });
  });

  it('publishes orgNoteRemoved after a successful org note delete', async () => {
    prisma.note.findUnique.mockResolvedValue({ id: 'n1', orgId: 'org1' });

    await service.removeOrgNote('n1', 'org1');

    expect(pubSub.publish).toHaveBeenCalledWith('orgNoteRemoved', {
      orgNoteRemoved: 'n1',
      orgId: 'org1',
    });
  });
});
