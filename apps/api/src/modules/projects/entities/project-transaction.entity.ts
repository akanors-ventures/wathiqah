import {
  ObjectType,
  Field,
  Float,
  ID,
  registerEnumType,
} from '@nestjs/graphql';
import {
  ProjectTransactionType,
  TransactionType,
} from '../../../generated/prisma/client';
import { Witness } from '../../witnesses/entities/witness.entity';
import { ProjectTransactionHistory } from './project-transaction-history.entity';
import { Contact } from '../../contacts/entities/contact.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { Project } from './project.entity';

registerEnumType(ProjectTransactionType, {
  name: 'ProjectTransactionType',
});

@ObjectType()
export class ProjectTransaction {
  @Field(() => ID)
  id: string;

  @Field(() => Float)
  amount: number;

  @Field(() => ProjectTransactionType)
  type: ProjectTransactionType;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  date: Date;

  @Field()
  projectId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [Witness], { nullable: true })
  witnesses?: Witness[];

  @Field(() => [ProjectTransactionHistory], { nullable: true })
  history?: ProjectTransactionHistory[];

  @Field(() => ID, { nullable: true })
  contactId?: string;

  @Field(() => Contact, { nullable: true })
  contact?: Contact;

  @Field(() => TransactionType, { nullable: true })
  contactTransactionType?: TransactionType;

  @Field()
  isMirroredFromContact: boolean;

  @Field(() => ID, { nullable: true })
  transactionId?: string;

  @Field(() => Transaction, { nullable: true })
  transaction?: Transaction;

  @Field(() => Project, { nullable: true })
  project?: Project;
}
