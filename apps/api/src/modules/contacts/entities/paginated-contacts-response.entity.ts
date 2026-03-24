import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Contact } from './contact.entity';

@ObjectType()
export class PaginatedContactsResponse {
  @Field(() => [Contact])
  items: Contact[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
