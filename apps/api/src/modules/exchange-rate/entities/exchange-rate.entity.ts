import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class ExchangeRate {
  @Field()
  from: string;

  @Field()
  to: string;

  @Field(() => Float)
  rate: number;

  @Field()
  provider: string;

  @Field()
  lastUpdated: Date;
}
