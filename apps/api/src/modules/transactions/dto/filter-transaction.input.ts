import { InputType, Field } from '@nestjs/graphql';
import {
  TransactionType,
  TransactionStatus,
} from '../../../generated/prisma/client';

@InputType()
export class FilterTransactionInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => [TransactionType], { nullable: true })
  types?: TransactionType[];

  @Field(() => TransactionStatus, { nullable: true })
  status?: TransactionStatus;

  @Field({ nullable: true })
  contactId?: string;

  @Field({ nullable: true })
  currency?: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field({ nullable: true })
  minAmount?: number;

  @Field({ nullable: true })
  maxAmount?: number;
}
