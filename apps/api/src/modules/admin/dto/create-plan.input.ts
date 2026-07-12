import { InputType, Field, Float, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { SubscriptionTier } from '../../../generated/prisma/client';
import { BillingInterval } from '../../payment/dto/billing-interval.enum';

@InputType()
export class CreatePlanInput {
  @Field(() => SubscriptionTier)
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @Field(() => BillingInterval)
  @IsEnum(BillingInterval)
  interval: BillingInterval;

  @Field()
  @IsString()
  @MinLength(3)
  currency: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  amount: number;

  @Field()
  @IsString()
  @MinLength(1)
  name: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  duration?: number;
}
