import { InputType, Field, Float } from '@nestjs/graphql';
import { ProjectTransactionType } from '../../../generated/prisma/client';

@InputType()
export class LogProjectTransactionInput {
  @Field()
  projectId: string;

  @Field(() => Float)
  amount: number;

  @Field(() => ProjectTransactionType)
  type: ProjectTransactionType;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  date?: Date;
}
