import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class OrgNote {
  @Field(() => ID)
  id: string;

  @Field()
  orgId: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  category?: string;

  @Field()
  createdById: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
