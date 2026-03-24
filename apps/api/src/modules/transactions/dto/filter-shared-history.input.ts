import { InputType, Field, Int } from '@nestjs/graphql';
import {
  TransactionType,
  TransactionStatus,
} from '../../../generated/prisma/client';

@InputType()
export class FilterSharedHistoryInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => [TransactionType], { nullable: true })
  types?: TransactionType[];

  @Field(() => TransactionStatus, { nullable: true })
  status?: TransactionStatus;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
