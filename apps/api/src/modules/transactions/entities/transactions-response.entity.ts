import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { Transaction } from './transaction.entity';

@ObjectType()
export class TransactionsSummary {
  @Field(() => Float) totalLoanGiven: number;
  @Field(() => Float) totalLoanReceived: number;
  @Field(() => Float) totalRepaymentMade: number;
  @Field(() => Float) totalRepaymentReceived: number;
  @Field(() => Float) totalGiftGiven: number;
  @Field(() => Float) totalGiftReceived: number;
  @Field(() => Float) totalAdvancePaid: number;
  @Field(() => Float) totalAdvanceReceived: number;
  @Field(() => Float) totalDepositPaid: number;
  @Field(() => Float) totalDepositReceived: number;
  @Field(() => Float) totalEscrowed: number;
  @Field(() => Float) totalRemitted: number;
  @Field(() => Float) netBalance: number;
  @Field(() => String) currency: string;
}

@ObjectType()
export class TransactionsResponse {
  @Field(() => [Transaction]) items: Transaction[];
  @Field(() => TransactionsSummary) summary: TransactionsSummary;
  @Field(() => Int) total: number;
  @Field(() => Int) page: number;
  @Field(() => Int) limit: number;
}
