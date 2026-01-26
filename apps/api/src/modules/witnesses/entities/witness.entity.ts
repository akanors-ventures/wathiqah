import { ObjectType, Field, ID } from '@nestjs/graphql';
import { WitnessStatus } from '../../../generated/prisma/client';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

@ObjectType()
export class Witness {
  @Field(() => ID)
  id: string;

  @Field(() => WitnessStatus)
  status: WitnessStatus;

  @Field()
  invitedAt: Date;

  @Field({ nullable: true })
  acknowledgedAt?: Date;

  @Field()
  transactionId: string;

  @Field(() => Transaction, { nullable: true })
  transaction?: Transaction;

  @Field()
  userId: string;

  @Field(() => User, { nullable: true })
  user?: User;
}
