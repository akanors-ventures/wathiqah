import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { AttributionMode } from '../../../generated/prisma/client';
import { OrganisationMember } from './organisation-member.entity';

registerEnumType(AttributionMode, { name: 'AttributionMode' });

@ObjectType()
export class Organisation {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  logoUrl?: string;

  @Field({ nullable: true })
  industry?: string;

  @Field(() => AttributionMode)
  attributionMode: AttributionMode;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [OrganisationMember])
  members?: OrganisationMember[];

  @Field(() => Int)
  transactionCount: number;

  @Field(() => Int)
  contactCount: number;

  @Field(() => Int)
  activeProjectCount: number;
}
