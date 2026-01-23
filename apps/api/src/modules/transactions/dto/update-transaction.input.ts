import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { CreateTransactionInput } from './create-transaction.input';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class UpdateTransactionInput extends PartialType(
  CreateTransactionInput,
) {
  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
