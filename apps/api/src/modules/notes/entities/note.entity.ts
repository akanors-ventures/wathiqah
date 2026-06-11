import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Note {
  @Field(() => ID)
  id: string;

  @Field()
  createdById: string;

  @Field({ nullable: true })
  orgId?: string;

  @Field({ nullable: true })
  title?: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  category?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
