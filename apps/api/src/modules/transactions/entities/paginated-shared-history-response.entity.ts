import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Transaction } from './transaction.entity';

@ObjectType()
export class PaginatedSharedHistoryResponse {
  @Field(() => [Transaction])
  items: Transaction[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
