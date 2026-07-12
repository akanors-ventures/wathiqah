import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { SubscriptionTier, PlanStatus } from '../../../generated/prisma/client';

@InputType()
export class UpdatePlanInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @Field(() => PlanStatus, { nullable: true })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @Field(() => SubscriptionTier, { nullable: true })
  @IsOptional()
  @IsEnum(SubscriptionTier)
  tier?: SubscriptionTier;
}
