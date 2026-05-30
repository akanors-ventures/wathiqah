import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class PersonalEntrySummary {
  @Field(() => Float, { defaultValue: 0 })
  totalIncome: number;

  @Field(() => Float, { defaultValue: 0 })
  totalExpenses: number;

  @Field(() => Float, { defaultValue: 0 })
  netCashPosition: number;

  @Field({ defaultValue: 'NGN' })
  currency: string;
}
