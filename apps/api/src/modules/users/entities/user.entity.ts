import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  phoneNumber?: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  name?: string;

  @Field({ nullable: true })
  passwordHash?: string;

  @Field()
  isEmailVerified: boolean;

  @Field()
  preferredCurrency: string;

  @Field()
  createdAt: Date;
}
