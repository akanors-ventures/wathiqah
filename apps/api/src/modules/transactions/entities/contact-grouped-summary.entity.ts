import { ObjectType, Field } from '@nestjs/graphql';
import { Contact } from '../../contacts/entities/contact.entity';
import { TransactionsSummary } from './transactions-response.entity';

@ObjectType()
export class ContactGroupedSummary {
  @Field(() => Contact, { nullable: true })
  contact: Contact;

  @Field(() => TransactionsSummary)
  summary: TransactionsSummary;
}
