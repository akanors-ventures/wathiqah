import {
  ObjectType,
  Field,
  ID,
  Float,
  GraphQLISODateTime,
  registerEnumType,
} from '@nestjs/graphql';
import { SubscriptionTier, PlanStatus } from '../../../generated/prisma/client';

registerEnumType(PlanStatus, {
  name: 'PlanStatus',
  description: 'Local status of a Flutterwave payment plan',
});

@ObjectType()
export class PlanEntity {
  @Field(() => ID)
  id: string;

  @Field(() => SubscriptionTier, { nullable: true })
  tier?: SubscriptionTier | null;

  @Field()
  interval: string;

  @Field()
  currency: string;

  @Field(() => Float)
  amount: number;

  @Field()
  name: string;

  @Field()
  provider: string;

  @Field()
  providerPlanId: string;

  @Field(() => PlanStatus)
  status: PlanStatus;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}
