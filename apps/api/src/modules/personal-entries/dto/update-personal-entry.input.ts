import { InputType, Field, Float, ID } from '@nestjs/graphql';
import { PersonalEntryType } from '../../../generated/prisma/enums';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

@InputType()
export class UpdatePersonalEntryInput {
  @Field(() => ID)
  @IsUUID()
  id: string;

  @Field(() => PersonalEntryType, { nullable: true })
  @IsOptional()
  @IsEnum(PersonalEntryType)
  type?: PersonalEntryType;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  currency?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  date?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
