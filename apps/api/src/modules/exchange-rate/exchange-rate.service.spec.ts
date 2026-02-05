import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateService } from './exchange-rate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import axios from 'axios';
import { Prisma } from '../../generated/prisma/client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;

  const mockPrismaService = {
    exchangeRate: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    exchangeRateHistory: {
      create: jest.fn(),
    },
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'fx.exchangeRate.apiKey') return 'mock-api-key';
      if (key === 'fx.openExchange.appId') return 'mock-open-key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('convert', () => {
    it('should return same amount if currencies are identical', async () => {
      const result = await service.convert(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should convert amount correctly using cross-rates', async () => {
      // Mock USD to NGN rate = 1500
      // Mock USD to EUR rate = 0.9
      // Converting 1500 NGN to EUR should be (1500 / 1500) * 0.9 = 0.9

      mockCacheManager.get.mockImplementation((key: string) => {
        if (key === 'rate:USD:NGN') return 1500;
        if (key === 'rate:USD:EUR') return 0.9;
        return null;
      });

      const result = await service.convert(1500, 'NGN', 'EUR');
      expect(result).toBe(0.9);
    });

    it('should handle rounding correctly', async () => {
      // Mock USD to NGN = 1500.1234
      mockCacheManager.get.mockReturnValue(1500.1234);
      const result = await service.convert(1, 'USD', 'NGN');
      expect(result).toBe(1500.12);
    });

    it('should handle Decimal inputs', async () => {
      mockCacheManager.get.mockReturnValue(1500);
      const decimalAmount = new Prisma.Decimal(100);
      const result = await service.convert(decimalAmount, 'USD', 'NGN');
      expect(result).toBe(150000);
    });

    it('should return 0 if amount is 0', async () => {
      mockCacheManager.get.mockReturnValue(1500);
      const result = await service.convert(0, 'USD', 'NGN');
      expect(result).toBe(0);
    });

    it('should throw InternalServerErrorException if rate is not found', async () => {
      mockCacheManager.get.mockReturnValue(null);
      mockPrismaService.exchangeRate.findUnique.mockResolvedValue(null);

      await expect(service.convert(100, 'USD', 'INVALID')).rejects.toThrow(
        'Exchange rate for INVALID is unavailable',
      );
    });

    it('should handle negative amounts', async () => {
      mockCacheManager.get.mockReturnValue(1500);
      const result = await service.convert(-100, 'USD', 'NGN');
      expect(result).toBe(-150000);
    });
  });

  describe('updateRates', () => {
    it('should fetch from primary provider and update db', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          rates: {
            NGN: 1500,
            EUR: 0.9,
          },
        },
      });

      await service.updateRates();

      expect(mockPrismaService.exchangeRate.upsert).toHaveBeenCalled();
      expect(mockPrismaService.exchangeRateHistory.create).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'rate:USD:NGN',
        1500,
        3600000,
      );
    });

    it('should fallback to secondary provider if primary fails', async () => {
      // Primary (Open Exchange Rates) fails
      mockedAxios.get.mockRejectedValueOnce(new Error('API Down'));

      // Secondary (ExchangeRate-API) succeeds
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          result: 'success',
          conversion_rates: {
            NGN: 1550,
            EUR: 0.95,
          },
        },
      });

      await service.updateRates();

      expect(mockPrismaService.exchangeRate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { from_to: { from: 'USD', to: 'NGN' } },
          create: expect.objectContaining({ provider: 'ExchangeRate-API' }),
        }),
      );
    });

    it('should log error if all providers fail', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      mockedAxios.get.mockRejectedValue(new Error('All Down'));

      await service.updateRates();

      expect(loggerSpy).toHaveBeenCalledWith(
        'All exchange rate providers failed',
      );
    });
  });
});
