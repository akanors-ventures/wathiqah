import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { OrgRole } from '../../../generated/prisma/client';
import { Organisation } from './organisation.entity';

registerEnumType(OrgRole, { name: 'OrgRole' });

@ObjectType()
export class OrganisationMember {
  @Field(() => ID)
  id: string;

  @Field()
  orgId: string;

  @Field()
  userId: string;

  @Field(() => OrgRole)
  role: OrgRole;

  @Field()
  joinedAt: Date;

  @Field(() => Organisation)
  organisation: Organisation;
}
