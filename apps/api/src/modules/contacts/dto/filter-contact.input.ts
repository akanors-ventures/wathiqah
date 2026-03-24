import { InputType, Field, Int, registerEnumType } from '@nestjs/graphql';

export enum ContactBalanceStanding {
  ALL = 'ALL',
  OWED_TO_ME = 'OWED_TO_ME',
  I_OWE = 'I_OWE',
}

registerEnumType(ContactBalanceStanding, { name: 'ContactBalanceStanding' });

@InputType()
export class FilterContactInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => ContactBalanceStanding, { nullable: true })
  balanceStanding?: ContactBalanceStanding;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
