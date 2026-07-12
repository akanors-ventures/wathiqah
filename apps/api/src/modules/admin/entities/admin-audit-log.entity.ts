import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { AdminAction } from '../../../generated/prisma/client';
import { User } from '../../users/entities/user.entity';

registerEnumType(AdminAction, { name: 'AdminAction' });

@ObjectType()
export class AdminAuditLog {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  actorId: string;

  @Field(() => AdminAction)
  action: AdminAction;

  @Field(() => ID, { nullable: true })
  targetUserId?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown> | null;

  @Field()
  createdAt: Date;

  @Field(() => User, { nullable: true })
  actor?: User | null;

  @Field(() => User, { nullable: true })
  targetUser?: User | null;
}
