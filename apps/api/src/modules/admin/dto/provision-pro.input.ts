import { InputType, Field, ID } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';
import { IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class ProvisionProInput {
  @Field(() => ID)
  @IsUUID()
  userId: string;

  @Field(() => GraphQLISODateTime)
  @IsDate()
  @Type(() => Date)
  expiresAt: Date;
}
