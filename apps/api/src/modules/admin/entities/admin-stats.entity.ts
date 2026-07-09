import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class AdminStats {
  @Field(() => Int)
  totalUsers: number;

  @Field(() => Int)
  freeUsers: number;

  @Field(() => Int)
  proUsers: number;

  @Field(() => Int)
  provisionedProUsers: number;

  @Field(() => Int)
  adminUsers: number;

  @Field(() => Int)
  newUsersLast30Days: number;

  @Field(() => Int)
  activeSubscriptions: number;
}
