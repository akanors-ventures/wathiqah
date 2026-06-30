import { Test } from '@nestjs/testing';
import { OrgEventsService } from './org-events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PUB_SUB } from '../../common/pubsub/pubsub.module';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('OrgEventsService', () => {
  let service: OrgEventsService;
  let prisma: {
    orgEvent: {
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
      orgEvent: {
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
        OrgEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PUB_SUB, useValue: pubSub },
      ],
    }).compile();
    service = module.get(OrgEventsService);
  });

  it('creates an event scoped to the org', async () => {
    prisma.orgEvent.create.mockResolvedValue({ id: 'e1', orgId: 'org1' });

    const result = await service.create(
      {
        title: 'Eid al-Adha',
        date: '2026-06-06',
        category: 'Islamic Calendar',
      },
      'org1',
      'user1',
    );

    expect(prisma.orgEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ orgId: 'org1', createdById: 'user1' }),
      }),
    );
    expect(result.orgId).toBe('org1');
    expect(pubSub.publish).toHaveBeenCalledWith('orgEventCreated', {
      orgEventCreated: result,
      orgId: 'org1',
    });
  });

  it('returns upcoming events sorted by date ascending', async () => {
    await service.findUpcoming('org1');
    expect(prisma.orgEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { date: 'asc' } }),
    );
  });

  it('throws ForbiddenException when deleting another orgs event', async () => {
    prisma.orgEvent.findUnique.mockResolvedValue({
      id: 'e1',
      orgId: 'other-org',
    });
    await expect(service.remove('e1', 'org1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when event does not exist', async () => {
    prisma.orgEvent.findUnique.mockResolvedValue(null);
    await expect(service.remove('e1', 'org1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('publishes orgEventUpdated after a successful update', async () => {
    prisma.orgEvent.findUnique.mockResolvedValue({ id: 'e1', orgId: 'org1' });
    const updated = { id: 'e1', orgId: 'org1', title: 'Updated' };
    prisma.orgEvent.update.mockResolvedValue(updated);

    await service.update('e1', { title: 'Updated' }, 'org1');

    expect(pubSub.publish).toHaveBeenCalledWith('orgEventUpdated', {
      orgEventUpdated: updated,
      orgId: 'org1',
    });
  });

  it('publishes orgEventRemoved after a successful delete', async () => {
    prisma.orgEvent.findUnique.mockResolvedValue({ id: 'e1', orgId: 'org1' });

    await service.remove('e1', 'org1');

    expect(pubSub.publish).toHaveBeenCalledWith('orgEventRemoved', {
      orgEventRemoved: 'e1',
      orgId: 'org1',
    });
  });
});
