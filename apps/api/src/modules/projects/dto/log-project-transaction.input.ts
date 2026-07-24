import { InputType, Field, Float, ID } from '@nestjs/graphql';
import {
  ProjectTransactionType,
  TransactionType,
} from '../../../generated/prisma/client';
import { WitnessInviteInput } from '../../witnesses/dto/witness-invite.input';

@InputType()
export class LogProjectTransactionInput {
  @Field()
  projectId: string;

  @Field(() => Float)
  amount: number;

  @Field(() => ProjectTransactionType)
  type: ProjectTransactionType;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  date?: Date;

  @Field(() => [ID], { nullable: true })
  witnessUserIds?: string[];

  @Field(() => [WitnessInviteInput], { nullable: true })
  witnessInvites?: WitnessInviteInput[];

  /** Optionally link this project transaction to a contact — must be paired with contactTransactionType. */
  @Field(() => ID, { nullable: true })
  contactId?: string;

  /** The contact-ledger meaning of this project transaction (e.g. LOAN_RECEIVED). Required when contactId is set. */
  @Field(() => TransactionType, { nullable: true })
  contactTransactionType?: TransactionType;

  /** For repayment/remittance/gift-conversion contactTransactionTypes: which prior linked loan (from this same project) this closes. */
  @Field(() => ID, { nullable: true })
  parentTransactionId?: string;
}
