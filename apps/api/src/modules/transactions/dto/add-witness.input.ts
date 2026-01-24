import { InputType, Field, ID } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WitnessInviteInput } from '../../witnesses/dto/witness-invite.input';

@InputType()
export class AddWitnessInput {
  @Field(() => ID)
  @IsString()
  transactionId: string;

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  witnessUserIds?: string[];

  @Field(() => [WitnessInviteInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WitnessInviteInput)
  witnessInvites?: WitnessInviteInput[];
}
