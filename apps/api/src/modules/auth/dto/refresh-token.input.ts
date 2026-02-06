import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
export class RefreshTokenInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
