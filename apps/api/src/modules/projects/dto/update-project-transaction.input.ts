import { InputType, Field, Float, ID } from '@nestjs/graphql';
import {
  ProjectTransactionType,
  TransactionType,
} from '../../../generated/prisma/client';

@InputType()
export class UpdateProjectTransactionInput {
  @Field(() => ID)
  id: string;

  @Field(() => Float, { nullable: true })
  amount?: number;

  @Field(() => ProjectTransactionType, { nullable: true })
  type?: ProjectTransactionType;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  date?: Date;

  /** Only settable when the transaction is not yet linked (retroactive linking) — immutable once set. */
  @Field(() => ID, { nullable: true })
  contactId?: string;

  /** Immutable once linked. */
  @Field(() => TransactionType, { nullable: true })
  contactTransactionType?: TransactionType;

  /** Only used when retroactively linking a repayment/remittance/gift-conversion type. */
  @Field(() => ID, { nullable: true })
  parentTransactionId?: string;
}
