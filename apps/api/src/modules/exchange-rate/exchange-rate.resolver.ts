import { Resolver, Query, Args } from '@nestjs/graphql';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';

@Resolver(() => ExchangeRate)
@UseGuards(GqlAuthGuard)
export class ExchangeRateResolver {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Query(() => Number, { name: 'convertCurrency' })
  async convert(
    @Args('amount') amount: number,
    @Args('from') from: string,
    @Args('to') to: string,
  ): Promise<number> {
    return this.exchangeRateService.convert(amount, from, to);
  }
}
