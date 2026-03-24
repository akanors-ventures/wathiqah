import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Witness } from './witness.entity';

@ObjectType()
export class PaginatedWitnessesResponse {
  @Field(() => [Witness])
  items: Witness[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
