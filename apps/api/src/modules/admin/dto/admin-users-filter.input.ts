import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { UserRole, SubscriptionTier } from '../../../generated/prisma/client';
import { PaginationInput } from '../../../common/dto/pagination.input';

@InputType()
export class AdminUsersFilterInput extends PaginationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @Field(() => SubscriptionTier, { nullable: true })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;
}
