import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class OrgEvent {
  @Field(() => ID)
  id: string;

  @Field()
  orgId: string;

  @Field()
  title: string;

  @Field()
  date: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field()
  category: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  isRecurring: boolean;

  @Field({ nullable: true })
  recurrence?: string;

  @Field()
  createdById: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
