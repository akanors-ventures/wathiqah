import { InputType, Field, Float, ID } from '@nestjs/graphql';
import { ProjectTransactionType } from '../../../generated/prisma/client';
import { WitnessInviteInput } from '../../witnesses/dto/witness-invite.input';

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

  @Field(() => [ID], { nullable: true })
  witnessUserIds?: string[];

  @Field(() => [WitnessInviteInput], { nullable: true })
  witnessInvites?: WitnessInviteInput[];
}
