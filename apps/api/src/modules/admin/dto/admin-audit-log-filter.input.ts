import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsEnum } from 'class-validator';
import { AdminAction } from '../../../generated/prisma/client';
import { PaginationInput } from '../../../common/dto/pagination.input';

@InputType()
export class AdminAuditLogFilterInput extends PaginationInput {
  @Field(() => AdminAction, { nullable: true })
  @IsOptional()
  @IsEnum(AdminAction)
  action?: AdminAction;
}
