import { ObjectType, Field, Int } from '@nestjs/graphql';
import { AdminAuditLog } from './admin-audit-log.entity';

@ObjectType()
export class PaginatedAuditLogsResponse {
  @Field(() => [AdminAuditLog])
  items: AdminAuditLog[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
