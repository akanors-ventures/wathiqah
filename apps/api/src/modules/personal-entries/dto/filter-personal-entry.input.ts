import { InputType, Field, Int } from '@nestjs/graphql';
import { PersonalEntryType } from '../../../generated/prisma/enums';

@InputType()
export class FilterPersonalEntryInput {
  @Field(() => PersonalEntryType, { nullable: true })
  type?: PersonalEntryType;

  @Field({ nullable: true })
  search?: string;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}
