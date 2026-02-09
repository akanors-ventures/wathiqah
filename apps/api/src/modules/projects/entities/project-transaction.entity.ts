import {
  ObjectType,
  Field,
  Float,
  ID,
  registerEnumType,
} from '@nestjs/graphql';
import { ProjectTransactionType } from '../../../generated/prisma/client';

registerEnumType(ProjectTransactionType, {
  name: 'ProjectTransactionType',
});

@ObjectType()
export class ProjectTransaction {
  @Field(() => ID)
  id: string;

  @Field(() => Float)
  amount: number;

  @Field(() => ProjectTransactionType)
  type: ProjectTransactionType;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  date: Date;

  @Field()
  projectId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
