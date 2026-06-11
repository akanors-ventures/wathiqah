import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateNoteInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  body: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;
}
