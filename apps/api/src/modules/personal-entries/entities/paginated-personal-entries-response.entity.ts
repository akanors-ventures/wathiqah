import { ObjectType, Field, Int } from '@nestjs/graphql';
import { PersonalEntry } from './personal-entry.entity';

@ObjectType()
export class PaginatedPersonalEntriesResponse {
  @Field(() => [PersonalEntry])
  items: PersonalEntry[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
