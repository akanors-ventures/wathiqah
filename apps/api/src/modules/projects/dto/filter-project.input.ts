import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class FilterProjectInput {
  @Field(() => ID, { nullable: true })
  userId?: string;

  // Add other filters as needed
}
