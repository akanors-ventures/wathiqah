import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Transaction } from './transaction.entity';

@ObjectType()
export class TransactionsSummary {
  @Field(() => Float)
  totalGiven: number;

  @Field(() => Float)
  totalReceived: number;

  @Field(() => Float)
  totalCollected: number;

  @Field(() => Float)
  totalExpense: number;

  @Field(() => Float)
  totalIncome: number;

  @Field(() => Float)
  netBalance: number;
}

@ObjectType()
export class TransactionsResponse {
  @Field(() => [Transaction])
  items: Transaction[];

  @Field(() => TransactionsSummary)
  summary: TransactionsSummary;
}
