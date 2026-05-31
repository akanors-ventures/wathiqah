import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { AttributionMode } from '../../../generated/prisma/client';

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
}
