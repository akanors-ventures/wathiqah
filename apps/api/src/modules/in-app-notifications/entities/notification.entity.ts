import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { NotificationType } from '../../../generated/prisma/client';

registerEnumType(NotificationType, { name: 'NotificationType' });

@ObjectType()
export class Notification {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field(() => NotificationType)
  type: NotificationType;

  @Field()
  title: string;

  @Field()
  body: string;

  @Field({ nullable: true })
  link?: string | null;

  @Field()
  read: boolean;

  @Field()
  createdAt: Date;
}
