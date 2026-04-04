import { InputType, Field, Float, Int, ID } from '@nestjs/graphql';
import {
  AssetCategory,
  TransactionType,
} from '../../../generated/prisma/client';
import {
  IsEnum,
  IsNotIn,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  @IsNotIn(['EXPENSE', 'INCOME', 'GIVEN', 'RECEIVED', 'RETURNED', 'GIFT'], {
    message:
      'This transaction type is no longer supported. Use the new formal types.',
  })
  type: TransactionType;

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
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
  parentId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsUUID()
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
