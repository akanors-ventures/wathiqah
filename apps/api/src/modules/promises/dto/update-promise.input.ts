import { CreatePromiseInput } from './create-promise.input';
import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { PromiseStatus } from '../../../generated/prisma/client';

@InputType()
export class UpdatePromiseInput extends PartialType(CreatePromiseInput) {
  @Field()
  id: string;

  @Field(() => PromiseStatus, { nullable: true })
  @IsOptional()
  @IsEnum(PromiseStatus)
  status?: PromiseStatus;
}
