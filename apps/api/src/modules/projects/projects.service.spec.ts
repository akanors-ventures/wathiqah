import { Test } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectBalanceStanding } from './dto/filter-project.input';

describe('ProjectsService — findAll pagination', () => {
  let service: ProjectsService;
  let prisma: {
    project: { findMany: jest.Mock; count: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      project: { findMany: jest.fn(), count: jest.fn() },
      $queryRaw: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ProjectsService);
  });

  it('returns paginated projects with total', async () => {
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'Alpha',
        balance: 100,
        budget: 200,
        status: 'ACTIVE',
      },
    ]);
    prisma.project.count.mockResolvedValue(1);
    const result = await service.findAll('user-1', { page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('filters by OVER_BUDGET — uses $queryRaw', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.project.findMany.mockResolvedValue([]);
    await service.findAll('user-1', {
      balanceStanding: ProjectBalanceStanding.OVER_BUDGET,
    });
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });
});
