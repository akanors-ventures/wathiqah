import { InputType, Field, ID } from '@nestjs/graphql';
import { IsEnum, IsUUID } from 'class-validator';
import { WitnessStatus } from '../../../generated/prisma/client';

@InputType()
export class AcknowledgeWitnessInput {
  @Field(() => ID, { nullable: true })
  @IsUUID()
  witnessId?: string;

  @Field({ nullable: true })
  token?: string;

  @Field(() => WitnessStatus)
  @IsEnum(WitnessStatus)
  status: WitnessStatus;
}
