import { InputType, Field, Float, ID } from '@nestjs/graphql';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class AllocationTargetInput {
  @Field(() => ID)
  @IsUUID()
  targetTransactionId: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0.01)
  amount: number;
}

@InputType()
export class AllocateTransactionsInput {
  /** The credit pool being drawn down — a standalone ESCROWED or REMITTED. */
  @Field(() => ID)
  @IsUUID()
  sourceTransactionId: string;

  /**
   * The obligations this pass settles. Applied atomically: a validation
   * failure on any row leaves none of them applied.
   */
  @Field(() => [AllocationTargetInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AllocationTargetInput)
  allocations: AllocationTargetInput[];

  /**
   * When the money was applied. Distinct from createdAt: allocation happens in
   * passes over time, and the pass date is the meaningful one.
   */
  @Field(() => Date, { nullable: true })
  @IsOptional()
  date?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}
