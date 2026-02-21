import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { SubscriptionTier } from '../../subscription/subscription.constants';
import { GraphQLJSON } from 'graphql-type-json';

registerEnumType(SubscriptionTier, {
  name: 'SubscriptionTier',
  description: 'The subscription tier of the user',
});

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phoneNumber?: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  name?: string;

  @Field({ nullable: true })
  passwordHash?: string;

  @Field()
  isEmailVerified: boolean;

  @Field()
  preferredCurrency: string;

  @Field(() => SubscriptionTier)
  tier: SubscriptionTier;

  @Field({ nullable: true })
  subscriptionStatus?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  featureUsage?: Record<string, unknown> | null;

  @Field()
  isSupporter: boolean;

  @Field()
  createdAt: Date;
}
