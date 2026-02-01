import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Transaction } from './transaction.entity';

@ObjectType()
export class TransactionsSummary {
  @Field(() => Float)
  totalGiven: number;

  @Field(() => Float)
  totalReceived: number;

  @Field(() => Float)
  totalReturned: number;

  @Field(() => Float)
  totalReturnedToMe: number;

  @Field(() => Float)
  totalReturnedToOther: number;

  @Field(() => Float)
  totalIncome: number;

  @Field(() => Float)
  totalExpense: number;

  @Field(() => Float)
  totalGiftGiven: number;

  @Field(() => Float)
  totalGiftReceived: number;

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
