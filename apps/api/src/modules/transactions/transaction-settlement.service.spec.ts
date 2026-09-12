import { Test, TestingModule } from '@nestjs/testing';
import { TransactionSettlementService } from './transaction-settlement.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  organisationMember: {
    findUnique: jest.fn(),
  },
};

describe('TransactionSettlementService', () => {
  let service: TransactionSettlementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionSettlementService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TransactionSettlementService>(
      TransactionSettlementService,
    );

    jest.clearAllMocks();
  });

  describe('assertWriteAuthority', () => {
    // The single home for "personal rows are creator-only" — update(),
    // remove(), and TransactionAllocationsService.assertWriteAuthority all
    // call this rather than each hand-writing the same condition.
    it('forbids a non-creator on a personal row', () => {
      expect(() =>
        service.assertWriteAuthority(
          { orgId: null, createdById: 'fawaz' },
          'someone-else',
          'edit this thing',
        ),
      ).toThrow('Only the creator can edit this thing');
    });

    it('allows the creator on a personal row', () => {
      expect(() =>
        service.assertWriteAuthority(
          { orgId: null, createdById: 'fawaz' },
          'fawaz',
          'edit this thing',
        ),
      ).not.toThrow();
    });

    it('allows anyone on an org-scoped row — membership is checked separately', () => {
      expect(() =>
        service.assertWriteAuthority(
          { orgId: 'org-1', createdById: 'fawaz' },
          'someone-else',
          'edit this thing',
        ),
      ).not.toThrow();
    });
  });
});
