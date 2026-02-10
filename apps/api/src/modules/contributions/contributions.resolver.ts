import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { ContributionsService } from './contributions.service';
import {
  Contribution,
  ContributionOption,
} from './entities/contribution.entity';
import { CreateContributionInput } from './dto/create-contribution.input';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CheckoutSession } from '../subscription/entities/subscription.entity';
import { PaymentService } from '../payment/payment.service';
import { GeoIPInterceptor } from '../../common/interceptors/geoip.interceptor';
import { GeoIPInfo } from '../geoip/entities/geoip-info.entity';

@Resolver(() => Contribution)
export class ContributionsResolver {
  constructor(
    private readonly contributionsService: ContributionsService,
    private readonly paymentService: PaymentService,
  ) {}

  @Mutation(() => Contribution)
  createContribution(
    @Args('createContributionInput')
    createContributionInput: CreateContributionInput,
    @CurrentUser() user?: User,
  ) {
    return this.contributionsService.create(createContributionInput, user?.id);
  }

  @Query(() => [ContributionOption], { name: 'contributionOptions' })
  @UseInterceptors(GeoIPInterceptor)
  async getContributionOptions(
    @Context() context: { req: Request & { geoip?: GeoIPInfo } },
    @Args('currency', { type: () => String, nullable: true }) currency?: string,
  ): Promise<ContributionOption[]> {
    const effectiveCurrency =
      currency || context.req.geoip?.currencyCode || 'USD';
    return this.contributionsService.getContributionOptions(effectiveCurrency);
  }

  @Mutation(() => CheckoutSession, { name: 'createContributionSession' })
  @UseGuards(GqlAuthGuard)
  @UseInterceptors(GeoIPInterceptor)
  async createContributionSession(
    @Context() context: { req: Request & { geoip?: GeoIPInfo } },
    @CurrentUser() user: User,
    @Args('amount', { type: () => Number, nullable: true }) amount?: number,
    @Args('currency', { type: () => String, nullable: true }) currency?: string,
  ): Promise<CheckoutSession> {
    return this.paymentService.createContributionSession(
      user.id,
      amount,
      currency,
      context.req.geoip,
    );
  }

  @Query(() => [Contribution], { name: 'contributions' })
  findAll() {
    return this.contributionsService.findAll();
  }

  @Query(() => [Contribution], { name: 'myContributions' })
  @UseGuards(GqlAuthGuard)
  findMyContributions(@CurrentUser() user: User) {
    return this.contributionsService.findByDonor(user.id);
  }

  @Query(() => Contribution, { name: 'contribution' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.contributionsService.findOne(id);
  }
}
