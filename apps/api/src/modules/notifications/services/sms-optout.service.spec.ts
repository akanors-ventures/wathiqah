import { Test, TestingModule } from '@nestjs/testing';
import { SmsOptOutService } from './sms-optout.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OptOutSource } from '../../../generated/prisma/client';

const mockPrisma = {
  smsOptOut: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('SmsOptOutService', () => {
  let service: SmsOptOutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsOptOutService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SmsOptOutService>(SmsOptOutService);
    jest.clearAllMocks();
  });

  describe('isOptedOut', () => {
    it('returns false when phone number is not in opt-out list', async () => {
      mockPrisma.smsOptOut.findUnique.mockResolvedValue(null);
      expect(await service.isOptedOut('+2348000000000')).toBe(false);
    });

    it('returns true when phone number is in opt-out list', async () => {
      mockPrisma.smsOptOut.findUnique.mockResolvedValue({
        id: '1',
        phoneNumber: '+2348000000000',
        source: OptOutSource.REPLY_STOP,
        createdAt: new Date(),
      });
      expect(await service.isOptedOut('+2348000000000')).toBe(true);
    });
  });

  describe('addOptOut', () => {
    it('upserts an opt-out record with the given source', async () => {
      mockPrisma.smsOptOut.upsert.mockResolvedValue({});
      await service.addOptOut('+2348000000000', OptOutSource.REPLY_STOP);
      expect(mockPrisma.smsOptOut.upsert).toHaveBeenCalledWith({
        where: { phoneNumber: '+2348000000000' },
        create: { phoneNumber: '+2348000000000', source: OptOutSource.REPLY_STOP },
        update: { source: OptOutSource.REPLY_STOP },
      });
    });
  });
});
