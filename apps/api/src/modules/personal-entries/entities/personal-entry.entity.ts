import {
  ObjectType,
  Field,
  Float,
  ID,
  registerEnumType,
} from '@nestjs/graphql';
import { PersonalEntryType } from '../../../generated/prisma/enums';

registerEnumType(PersonalEntryType, { name: 'PersonalEntryType' });

@ObjectType()
export class PersonalEntry {
  @Field(() => ID)
  id: string;

  @Field(() => PersonalEntryType)
  type: PersonalEntryType;

  @Field(() => Float)
  amount: number;

  @Field({ defaultValue: 'NGN' })
  currency: string;

  @Field({ nullable: true })
  category?: string;

  @Field()
  date: Date;

  @Field({ nullable: true })
  description?: string;

  @Field()
  createdAt: Date;

  @Field()
  createdById: string;
}
