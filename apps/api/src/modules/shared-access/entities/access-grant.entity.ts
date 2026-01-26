import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { AccessStatus } from '../../../generated/prisma/client';
import { User } from '../../users/entities/user.entity';

registerEnumType(AccessStatus, { name: 'AccessStatus' });

@ObjectType()
export class AccessGrant {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  token: string;

  @Field(() => AccessStatus)
  status: AccessStatus;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field(() => User, { nullable: true })
  granter?: User;
}
