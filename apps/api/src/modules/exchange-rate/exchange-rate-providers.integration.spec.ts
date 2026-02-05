import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeRateService } from './exchange-rate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('ExchangeRateProvider Integration', () => {
  let service: ExchangeRateService;
  let configService: ConfigService;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockPrismaService = {
    exchangeRate: {
      upsert: jest.fn(),
    },
    exchangeRateHistory: {
      create: jest.fn(),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        ExchangeRateService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should reach ExchangeRate-API and return rates', async () => {
    const apiKey = configService.get('fx.exchangeRate.apiKey');
    if (!apiKey) {
      console.warn('Skipping ExchangeRate-API test: API key not found');
      return;
    }

    try {
      const result = await (service as any).fetchFromExchangeRateApi();
      expect(result.provider).toBe('ExchangeRate-API');
      expect(result.rates).toBeDefined();
      expect(result.rates['USD']).toBe(1);
      expect(result.rates['NGN']).toBeGreaterThan(0);
    } catch (error) {
      console.error('ExchangeRate-API unreachable:', error.message);
      throw error;
    }
  });

  it('should reach Open Exchange Rates and return rates', async () => {
    const apiKey = configService.get('fx.openExchange.appId');
    if (!apiKey) {
      console.warn('Skipping Open Exchange Rates test: API key not found');
      return;
    }

    try {
      const result = await (service as any).fetchFromOpenExchangeRates();
      expect(result.provider).toBe('Open Exchange Rates');
      expect(result.rates).toBeDefined();
      expect(result.rates['USD']).toBe(1);
      expect(result.rates['NGN']).toBeGreaterThan(0);
    } catch (error) {
      console.error('Open Exchange Rates unreachable:', error.message);
      throw error;
    }
  });
});
