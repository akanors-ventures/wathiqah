import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FlutterwavePlanService } from './flutterwave-plan.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanStatus, SubscriptionTier } from '../../generated/prisma/enums';
import * as axios from 'axios';

jest.mock('axios');

describe('FlutterwavePlanService', () => {
  let service: FlutterwavePlanService;

  const mockPrismaService = {
    plan: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'payment.flutterwave.secretKey') return 'secret_key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlutterwavePlanService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FlutterwavePlanService>(FlutterwavePlanService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('createPlan', () => {
    it('creates the plan on Flutterwave and upserts it locally with the requested tier and currency', async () => {
      const axiosMock = axios as unknown as { post: jest.Mock };
      axiosMock.post = jest.fn().mockResolvedValue({
        data: {
          data: {
            id: 163686,
            name: 'Monthly Wathiqah Pro',
            amount: 2500,
            interval: 'monthly',
            status: 'active',
          },
        },
      });
      mockPrismaService.plan.upsert.mockResolvedValue({ id: 'plan_1' });

      await service.createPlan(
        {
          tier: SubscriptionTier.PRO,
          interval: 'monthly',
          currency: 'NGN',
          amount: 2500,
          name: 'Monthly Wathiqah Pro',
        },
        'admin_1',
      );

      expect(axiosMock.post).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/payment-plans',
        { amount: 2500, name: 'Monthly Wathiqah Pro', interval: 'monthly' },
        expect.anything(),
      );
      expect(mockPrismaService.plan.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { providerPlanId: '163686' },
          create: expect.objectContaining({
            providerPlanId: '163686',
            name: 'Monthly Wathiqah Pro',
            currency: 'NGN',
            tier: SubscriptionTier.PRO,
            createdById: 'admin_1',
            status: PlanStatus.ACTIVE,
          }),
        }),
      );
    });

    it('throws a generic error when Flutterwave rejects the create call', async () => {
      const axiosMock = axios as unknown as { post: jest.Mock };
      axiosMock.post = jest.fn().mockRejectedValue(new Error('400'));

      await expect(
        service.createPlan(
          {
            tier: SubscriptionTier.PRO,
            interval: 'monthly',
            currency: 'NGN',
            amount: 2500,
            name: 'Monthly Wathiqah Pro',
          },
          'admin_1',
        ),
      ).rejects.toThrow('Could not create payment plan with Flutterwave');

      expect(mockPrismaService.plan.upsert).not.toHaveBeenCalled();
    });
  });

  describe('updatePlan', () => {
    it('throws NotFoundException when the local plan does not exist', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePlan('missing_plan', { name: 'New name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('merges the current name/status before calling Flutterwave, so a tier-only edit does not blank the other field', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: 'plan_1',
        providerPlanId: '163686',
        name: 'Monthly Wathiqah Pro',
        status: PlanStatus.ACTIVE,
      });
      const axiosMock = axios as unknown as { put: jest.Mock };
      axiosMock.put = jest.fn().mockResolvedValue({ data: {} });
      mockPrismaService.plan.update.mockResolvedValue({ id: 'plan_1' });

      await service.updatePlan('plan_1', { status: PlanStatus.INACTIVE });

      expect(axiosMock.put).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/payment-plans/163686',
        { name: 'Monthly Wathiqah Pro', status: 'inactive' },
        expect.anything(),
      );
    });

    it('skips the Flutterwave call entirely for a tier-only local update', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: 'plan_1',
        providerPlanId: '163686',
        name: 'Monthly Wathiqah Pro',
        status: PlanStatus.ACTIVE,
      });
      const axiosMock = axios as unknown as { put: jest.Mock };
      axiosMock.put = jest.fn();
      mockPrismaService.plan.update.mockResolvedValue({ id: 'plan_1' });

      await service.updatePlan('plan_1', { tier: SubscriptionTier.PRO });

      expect(axiosMock.put).not.toHaveBeenCalled();
      expect(mockPrismaService.plan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tier: SubscriptionTier.PRO }),
        }),
      );
    });
  });

  describe('cancelPlan', () => {
    it('cancels on Flutterwave and marks the local row CANCELLED', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: 'plan_1',
        providerPlanId: '163686',
      });
      const axiosMock = axios as unknown as { put: jest.Mock };
      axiosMock.put = jest.fn().mockResolvedValue({ data: {} });
      mockPrismaService.plan.update.mockResolvedValue({
        id: 'plan_1',
        status: PlanStatus.CANCELLED,
      });

      await service.cancelPlan('plan_1');

      expect(axiosMock.put).toHaveBeenCalledWith(
        'https://api.flutterwave.com/v3/payment-plans/163686/cancel',
        {},
        expect.anything(),
      );
      expect(mockPrismaService.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan_1' },
        data: { status: PlanStatus.CANCELLED },
      });
    });

    it('throws NotFoundException for an unknown local plan id', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.cancelPlan('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncFromFlutterwave', () => {
    it('upserts every plan returned across pages, stopping at the first empty page', async () => {
      const axiosMock = axios as unknown as { get: jest.Mock };
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                id: 1,
                name: 'Plan A',
                amount: 100,
                interval: 'monthly',
                currency: 'NGN',
                status: 'active',
              },
              {
                id: 2,
                name: 'Plan B',
                amount: 200,
                interval: 'yearly',
                currency: 'USD',
                status: 'active',
              },
            ],
          },
        })
        .mockResolvedValueOnce({ data: { data: [] } });
      mockPrismaService.plan.upsert.mockResolvedValue({ id: 'x' });

      const result = await service.syncFromFlutterwave();

      expect(axiosMock.get).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.plan.upsert).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('does not overwrite an existing local tier assignment on re-sync', async () => {
      const axiosMock = axios as unknown as { get: jest.Mock };
      axiosMock.get = jest
        .fn()
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                id: 1,
                name: 'Plan A',
                amount: 100,
                interval: 'monthly',
                currency: 'NGN',
                status: 'active',
              },
            ],
          },
        })
        .mockResolvedValueOnce({ data: { data: [] } });
      mockPrismaService.plan.upsert.mockResolvedValue({ id: 'x' });

      await service.syncFromFlutterwave();

      const upsertArgs = mockPrismaService.plan.upsert.mock.calls[0][0];
      expect(upsertArgs.update).not.toHaveProperty('tier');
      expect(upsertArgs.update).not.toHaveProperty('createdById');
    });

    it('throws a generic error when the list call fails', async () => {
      const axiosMock = axios as unknown as { get: jest.Mock };
      axiosMock.get = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(service.syncFromFlutterwave()).rejects.toThrow(
        'Could not sync payment plans from Flutterwave',
      );
    });
  });
});
