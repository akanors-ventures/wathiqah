import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateProjectInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  budget?: number;

  @Field({ nullable: true })
  currency?: string;
}
