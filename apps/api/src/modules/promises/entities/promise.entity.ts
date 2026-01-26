import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { Priority, PromiseStatus } from '../../../generated/prisma/client';

registerEnumType(Priority, { name: 'Priority' });
registerEnumType(PromiseStatus, { name: 'PromiseStatus' });

@ObjectType()
export class Promise {
  @Field()
  id: string;

  @Field()
  description: string;

  @Field()
  promiseTo: string;

  @Field()
  dueDate: Date;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => Priority)
  priority: Priority;

  @Field({ nullable: true })
  category?: string;

  @Field(() => PromiseStatus)
  status: PromiseStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
