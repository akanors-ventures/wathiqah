import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';
import { AssetCategory, TransactionType } from '../../../generated/prisma/client';

registerEnumType(AssetCategory, {
    name: 'AssetCategory',
});

registerEnumType(TransactionType, {
    name: 'TransactionType',
});

@ObjectType()
export class Transaction {
    @Field(() => ID)
    id: string;

    @Field(() => AssetCategory)
    category: AssetCategory;

    @Field(() => Float, { nullable: true })
    amount?: number;

    @Field({ nullable: true })
    itemName?: string;

    @Field(() => Int, { defaultValue: 1 })
    quantity: number;

    @Field(() => TransactionType)
    type: TransactionType;

    @Field()
    date: Date;

    @Field({ nullable: true })
    description?: string;

    @Field()
    createdAt: Date;

    @Field()
    contactId: string;

    @Field()
    createdById: string;
}
