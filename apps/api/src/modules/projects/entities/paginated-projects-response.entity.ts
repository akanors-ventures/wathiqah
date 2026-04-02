import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Project } from './project.entity';

@ObjectType()
export class PaginatedProjectsResponse {
  @Field(() => [Project])
  items: Project[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
