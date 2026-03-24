import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class PaginationInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 25 })
  limit?: number;
}

export function getPrismaSkip(page = 1, limit = 25): number {
  return (page - 1) * limit;
}
