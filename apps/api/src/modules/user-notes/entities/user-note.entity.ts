import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class UserNote {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  title: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  category?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
