import { InputType, Field, Float } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
} from 'class-validator';

@InputType()
export class CreateContributionInput {
  @Field(() => Float)
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @Field({ defaultValue: 'NGN' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  paymentProvider?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  donorName?: string;

  @Field({ nullable: true })
  @IsEmail()
  @IsOptional()
  donorEmail?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  message?: string;

  @Field({ defaultValue: false })
  @IsBoolean()
  @IsOptional()
  isAnonymous: boolean;
}
