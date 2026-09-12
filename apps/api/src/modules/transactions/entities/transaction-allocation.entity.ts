import {
  ObjectType,
  Field,
  Float,
  ID,
  registerEnumType,
} from '@nestjs/graphql';
import { AllocationStatus } from '../../../generated/prisma/client';
import { Transaction } from './transaction.entity';
import { User } from '../../users/entities/user.entity';

registerEnumType(AllocationStatus, {
  name: 'AllocationStatus',
});

/**
 * A link recording that `amount` of the source transaction's unapplied credit
 * has been applied against the target obligation. There is no Transaction row
 * behind it: one real money movement stays one transaction, and N allocations
 * carry how it was split.
 */
@ObjectType()
export class TransactionAllocation {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  sourceTransactionId: string;

  @Field(() => ID)
  targetTransactionId: string;

  @Field(() => Float)
  amount: number;

  @Field()
  currency: string;

  @Field()
  date: Date;

  @Field({ nullable: true })
  note?: string;

  @Field(() => AllocationStatus)
  status: AllocationStatus;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  reversedAt?: Date;

  @Field(() => Transaction, { nullable: true })
  sourceTransaction?: Transaction;

  @Field(() => Transaction, { nullable: true })
  targetTransaction?: Transaction;

  @Field(() => User, { nullable: true })
  createdBy?: User;
}
