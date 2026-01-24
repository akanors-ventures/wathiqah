import { InputType, Field, ID } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { WitnessStatus } from '../../../generated/prisma/client';

@InputType()
export class AcknowledgeWitnessInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  witnessId: string;

  @Field(() => WitnessStatus)
  @IsEnum(WitnessStatus)
  status: WitnessStatus;
}
