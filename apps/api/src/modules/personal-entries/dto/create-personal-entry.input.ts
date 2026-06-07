import { InputType, Field, Float } from '@nestjs/graphql';
import { PersonalEntryType } from '../../../generated/prisma/enums';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

@InputType()
export class CreatePersonalEntryInput {
  @Field(() => PersonalEntryType)
  @IsEnum(PersonalEntryType)
  type: PersonalEntryType;

  @Field(() => Float)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @Field({ defaultValue: 'NGN' })
  @IsString()
  currency: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field()
  date: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}
