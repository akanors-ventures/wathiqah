import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class FilterWitnessInput {
  @Field({ nullable: true })
  search?: string;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
