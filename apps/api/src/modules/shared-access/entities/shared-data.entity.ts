import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { Promise } from '../../promises/entities/promise.entity';

@ObjectType()
export class SharedDataEntity {
  @Field(() => User)
  user: User;

  @Field(() => [Transaction])
  transactions: Transaction[];

  @Field(() => [Promise])
  promises: Promise[];
}
