import { InputType, Field, Int } from '@nestjs/graphql';
import { ProjectTransactionType } from '../../../generated/prisma/client';

@InputType()
export class FilterProjectTransactionInput {
  @Field(() => ProjectTransactionType, { nullable: true })
  type?: ProjectTransactionType;

  @Field({ nullable: true })
  category?: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
