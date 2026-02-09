import { ObjectType, Field, Float, ID } from '@nestjs/graphql';

@ObjectType()
export class Project {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  budget?: number;

  @Field(() => Float, { defaultValue: 0 })
  balance: number;

  @Field({ defaultValue: 'NGN' })
  currency: string;

  @Field()
  userId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
