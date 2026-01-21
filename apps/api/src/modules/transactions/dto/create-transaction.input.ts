import { InputType, Field, Float, Int, ID } from '@nestjs/graphql';
import { AssetCategory, TransactionType } from '../../../generated/prisma/client';
import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';

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

    @Field()
    date: Date;

    @Field({ nullable: true })
    @IsOptional()
    @IsString()
    description?: string;

    @Field(() => ID)
    contactId: string;
}
