import {
  ObjectType,
  Field,
  Float,
  Int,
  ID,
  registerEnumType,
} from '@nestjs/graphql';
import {
  AssetCategory,
  TransactionType,
  WitnessStatus,
} from '../../../generated/prisma/client';
import { Contact } from '../../contacts/entities/contact.entity';
import { User } from '../../users/entities/user.entity';
import { Witness } from '../../witnesses/entities/witness.entity';
import { TransactionHistory } from './transaction-history.entity';

registerEnumType(AssetCategory, {
  name: 'AssetCategory',
});

registerEnumType(TransactionType, {
  name: 'TransactionType',
});

registerEnumType(WitnessStatus, {
  name: 'WitnessStatus',
});

@ObjectType()
export class Transaction {
  @Field(() => ID)
  id: string;

  @Field(() => AssetCategory)
  category: AssetCategory;

  @Field(() => Float, { nullable: true })
  amount?: number;

  @Field({ nullable: true })
  itemName?: string;

  @Field(() => Int, { nullable: true })
  quantity?: number;

  @Field(() => TransactionType)
  type: TransactionType;

  @Field()
  date: Date;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt: Date;

  @Field()
  contactId: string;

  @Field(() => Contact)
  contact: Contact;

  @Field()
  createdById: string;

  @Field(() => User)
  createdBy: User;

  @Field(() => [Witness], { nullable: 'items' })
  witnesses: Witness[];

  @Field(() => [TransactionHistory], { nullable: 'items' })
  history: TransactionHistory[];
}
