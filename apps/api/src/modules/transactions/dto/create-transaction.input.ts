import { InputType, Field, Float, Int, ID } from '@nestjs/graphql';
import {
  AssetCategory,
  TransactionType,
  ReturnDirection,
} from '../../../generated/prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WitnessInviteInput } from '../../witnesses/dto/witness-invite.input';

@InputType()
export class CreateTransactionInput {
  @Field(() => AssetCategory)
  @IsEnum(AssetCategory)
  category: AssetCategory;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  itemName?: string;

  @Field(() => Int, { defaultValue: 1, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @Field(() => TransactionType)
  @IsEnum(TransactionType)
  type: TransactionType;

  @Field(() => ReturnDirection, { nullable: true })
  @IsOptional()
  @IsEnum(ReturnDirection)
  returnDirection?: ReturnDirection;

  @Field({ defaultValue: 'NGN' })
  @IsString()
  currency: string;

  @Field()
  date: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  contactId?: string;

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  witnessUserIds?: string[];

  @Field(() => [WitnessInviteInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WitnessInviteInput)
  witnessInvites?: WitnessInviteInput[];
}
