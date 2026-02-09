import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class TierLimitsEntity {
  @Field(() => Int)
  maxContacts: number;

  @Field(() => Int)
  maxWitnessesPerMonth: number;

  @Field()
  allowSMS: boolean;

  @Field()
  allowAdvancedAnalytics: boolean;

  @Field()
  allowProfessionalReports: boolean;
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
}

@ObjectType()
export class CheckoutSession {
  @Field()
  url: string;

  @Field({ nullable: true })
  sessionId?: string;
}
