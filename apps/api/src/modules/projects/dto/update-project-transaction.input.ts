import { InputType, Field, Float, ID } from '@nestjs/graphql';
import { ProjectTransactionType } from '../../../generated/prisma/client';

@InputType()
export class UpdateProjectTransactionInput {
  @Field(() => ID)
  id: string;

  @Field(() => Float, { nullable: true })
  amount?: number;

  @Field(() => ProjectTransactionType, { nullable: true })
  type?: ProjectTransactionType;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  date?: Date;
}
