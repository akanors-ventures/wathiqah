import { ObjectType, Field, ID } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class TransactionHistory {
  @Field(() => ID)
  id: string;

  @Field()
  transactionId: string;

  @Field()
  userId: string;

  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => GraphQLJSON)
  previousState: any;

  @Field(() => GraphQLJSON)
  newState: any;

  @Field()
  changeType: string;

  @Field()
  createdAt: Date;
}
