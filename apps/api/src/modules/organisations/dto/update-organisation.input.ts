import { InputType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AttributionMode } from '../../../generated/prisma/client';

@InputType()
export class UpdateOrganisationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  industry?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @Field(() => AttributionMode, { nullable: true })
  @IsOptional()
  @IsEnum(AttributionMode)
  attributionMode?: AttributionMode;
}
