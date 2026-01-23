import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class Contact {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phoneNumber?: string;

  @Field()
  createdAt: Date;

  @Field()
  userId: string;

  @Field(() => User)
  user: User;

  @Field(() => [Transaction], { nullable: 'items' })
  transactions: Transaction[];
}
