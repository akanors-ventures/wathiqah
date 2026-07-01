import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class TierLimitsEntity {
  @Field(() => Int)
  maxContacts: number;

  @Field(() => Int)
  maxWitnessesPerMonth: number;

  @Field(() => Int)
  contactNotificationSms: number;

  @Field(() => Int)
  maxNotes: number;

  @Field()
  allowSMS: boolean;

  @Field()
  allowAdvancedAnalytics: boolean;

  @Field()
  allowProfessionalReports: boolean;

  @Field()
  allowOrganisations: boolean;
}

@ObjectType()
export class CurrencyPricing {
  @Field()
  currency: string;

  @Field(() => Float)
  monthly: number;

  @Field(() => Float)
  annual: number;
}

@ObjectType()
export class ProPricing {
  @Field(() => [CurrencyPricing])
  currencies: CurrencyPricing[];

  @Field(() => TierLimitsEntity)
  freeLimits: TierLimitsEntity;

  @Field(() => TierLimitsEntity)
  proLimits: TierLimitsEntity;
}

@ObjectType()
export class SubscriptionInfo {
  @Field()
  tier: string;

  @Field(() => TierLimitsEntity)
  limits: TierLimitsEntity;

  @Field(() => GraphQLJSON, { nullable: true })
  featureUsage?: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  subscriptionStatus?: string;

  @Field(() => Boolean, { nullable: true })
  cancelAtPeriodEnd?: boolean;

  @Field(() => Date, { nullable: true })
  currentPeriodEnd?: Date;
}

@ObjectType()
export class CheckoutSession {
  @Field()
  url: string;

  @Field({ nullable: true })
  sessionId?: string;
}
