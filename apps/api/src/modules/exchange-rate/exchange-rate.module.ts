import { Module } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateResolver } from './exchange-rate.resolver';

@Module({
  providers: [ExchangeRateService, ExchangeRateResolver],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
