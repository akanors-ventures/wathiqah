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
  ReturnDirection,
} from '../../../generated/prisma/client';
import { Contact } from '../../contacts/entities/contact.entity';
import { User } from '../../users/entities/user.entity';
import { Witness } from '../../witnesses/entities/witness.entity';
import { TransactionHistory } from './transaction-history.entity';

registerEnumType(ReturnDirection, {
  name: 'ReturnDirection',
});

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

  @Field(() => ReturnDirection, { nullable: true })
  returnDirection?: ReturnDirection;

  @Field()
  date: Date;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  createdAt: Date;

  @Field({ nullable: true })
  parentId?: string;

  @Field(() => Transaction, { nullable: true })
  parent?: Transaction;

  @Field(() => [Transaction], { nullable: true })
  conversions?: Transaction[];

  @Field({ nullable: true })
  contactId?: string;

  @Field(() => Contact, { nullable: true })
  contact?: Contact;

  @Field()
  createdById: string;

  @Field(() => User)
  createdBy: User;

  @Field(() => [Witness], { nullable: true })
  witnesses?: Witness[];

  @Field(() => [TransactionHistory], { nullable: true })
  history?: TransactionHistory[];
}
