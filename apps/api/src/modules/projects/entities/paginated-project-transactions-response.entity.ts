import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ProjectTransaction } from './project-transaction.entity';

@ObjectType()
export class PaginatedProjectTransactionsResponse {
  @Field(() => [ProjectTransaction])
  items: ProjectTransaction[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
