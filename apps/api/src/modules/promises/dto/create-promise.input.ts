import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Priority } from '../../../generated/prisma/client';

@InputType()
export class CreatePromiseInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  description: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  promiseTo: string;

  @Field()
  @IsDate()
  dueDate: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field(() => Priority, { nullable: true })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;
}
