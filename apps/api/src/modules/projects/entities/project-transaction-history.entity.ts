import { ObjectType, Field, ID } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class ProjectTransactionHistory {
  @Field(() => ID)
  id: string;

  @Field()
  projectTransactionId: string;

  @Field()
  userId: string;

  @Field(() => GraphQLJSON)
  previousState: Record<string, unknown>;

  @Field(() => GraphQLJSON)
  newState: Record<string, unknown>;

  @Field()
  changeType: string;

  @Field()
  createdAt: Date;
}
