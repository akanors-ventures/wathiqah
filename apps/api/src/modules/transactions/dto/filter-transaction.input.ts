import { InputType, Field } from '@nestjs/graphql';
import { TransactionType } from '../../../generated/prisma/client';

@InputType()
export class FilterTransactionInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => TransactionType, { nullable: true })
  type?: TransactionType;

  @Field({ nullable: true })
  contactId?: string;
}
