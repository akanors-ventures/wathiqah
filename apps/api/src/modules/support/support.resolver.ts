import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { SupportService } from './support.service';
import { Support, SupportOption } from './entities/support.entity';
import { CreateSupportInput } from './dto/create-support.input';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CheckoutSession } from '../subscription/entities/subscription.entity';
import { PaymentService } from '../payment/payment.service';
import { GeoIPInterceptor } from '../../common/interceptors/geoip.interceptor';
import { GeoIPInfo } from '../geoip/entities/geoip-info.entity';

@Resolver(() => Support)
export class SupportResolver {
  constructor(
    private readonly supportService: SupportService,
    private readonly paymentService: PaymentService,
  ) {}

  @Mutation(() => Support)
  createSupport(
    @Args('createSupportInput')
    createSupportInput: CreateSupportInput,
    @CurrentUser() user?: User,
  ) {
    return this.supportService.create(createSupportInput, user?.id);
  }

  @Query(() => [SupportOption], { name: 'supportOptions' })
  @UseInterceptors(GeoIPInterceptor)
  async getSupportOptions(
    @Context() context: { req: Request & { geoip?: GeoIPInfo } },
    @Args('currency', { type: () => String, nullable: true }) currency?: string,
  ): Promise<SupportOption[]> {
    const effectiveCurrency =
      currency || context.req.geoip?.currencyCode || 'USD';
    return this.supportService.getSupportOptions(effectiveCurrency);
  }

  @Mutation(() => CheckoutSession, { name: 'createSupportSession' })
  @UseGuards(GqlAuthGuard)
  @UseInterceptors(GeoIPInterceptor)
  async createSupportSession(
    @Context() context: { req: Request & { geoip?: GeoIPInfo } },
    @CurrentUser() user: User,
    @Args('amount', { type: () => Number, nullable: true }) amount?: number,
    @Args('currency', { type: () => String, nullable: true }) currency?: string,
  ): Promise<CheckoutSession> {
    return this.paymentService.createSupportSession(
      user.id,
      amount,
      currency,
      context.req.geoip,
    );
  }

  @Query(() => [Support], { name: 'supports' })
  findAll() {
    return this.supportService.findAll();
  }

  @Query(() => [Support], { name: 'mySupports' })
  @UseGuards(GqlAuthGuard)
  findMySupports(@CurrentUser() user: User) {
    return this.supportService.findBySupporter(user.id);
  }

  @Query(() => Support, { name: 'support' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.supportService.findOne(id);
  }
}
