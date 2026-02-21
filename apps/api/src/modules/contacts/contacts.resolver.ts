import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { Contact } from './entities/contact.entity';
import { Contact as PrismaContact } from '../../generated/prisma/client';
import { CreateContactInput } from './dto/create-contact.input';
import { UpdateContactInput } from './dto/update-contact.input';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  InviteContactResponse,
  ContactPlatformStatus,
} from './entities/invite-response.entity';
import { CheckFeature } from '../subscription/decorators/check-feature.decorator';
import { FeatureLimitInterceptor } from '../subscription/interceptors/feature-limit.interceptor';

@Resolver(() => Contact)
@UseGuards(GqlAuthGuard)
export class ContactsResolver {
  constructor(private readonly contactsService: ContactsService) {}

  @Mutation(() => Contact)
  @CheckFeature('maxContacts')
  @UseInterceptors(FeatureLimitInterceptor)
  createContact(
    @Args('createContactInput') createContactInput: CreateContactInput,
    @CurrentUser() user: User,
  ) {
    return this.contactsService.create(createContactInput, user.id);
  }

  @Query(() => [Contact], { name: 'contacts' })
  findAll(@CurrentUser() user: User) {
    return this.contactsService.findAll(user.id);
  }

  @Query(() => Contact, { name: 'contact' })
  findOne(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.contactsService.findOne(id, user.id);
  }

  @ResolveField(() => String)
  name(@Parent() contact: Contact): string {
    return `${contact.firstName} ${contact.lastName}`.trim();
  }

  @ResolveField(() => Number)
  async balance(@Parent() contact: Contact, @CurrentUser() user: User) {
    return this.contactsService.getBalance(contact.id, user.id);
  }

  @ResolveField(() => Boolean)
  async isOnPlatform(
    @Parent() contact: Contact,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const status = await this.contactsService.checkContactOnPlatform(
      contact.id,
      user.id,
      contact as PrismaContact,
    );
    return status.isRegistered;
  }

  @ResolveField(() => Boolean)
  async isSupporter(
    @Parent() contact: Contact,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const status = await this.contactsService.checkContactOnPlatform(
      contact.id,
      user.id,
      contact as PrismaContact,
    );
    return status.registeredUser?.isSupporter ?? false;
  }

  @ResolveField(() => Boolean)
  async hasPendingInvitation(
    @Parent() contact: Contact,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    const status = await this.contactsService.checkContactOnPlatform(
      contact.id,
      user.id,
      contact as PrismaContact,
    );
    return status.hasPendingInvitation;
  }

  @Mutation(() => Contact)
  updateContact(
    @Args('updateContactInput') updateContactInput: UpdateContactInput,
    @CurrentUser() user: User,
  ) {
    return this.contactsService.update(
      updateContactInput.id,
      updateContactInput,
      user.id,
    );
  }

  @Mutation(() => Contact)
  removeContact(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.contactsService.remove(id, user.id);
  }

  @Mutation(() => InviteContactResponse)
  inviteContactToPlatform(
    @Args('contactId', { type: () => ID }) contactId: string,
    @CurrentUser() user: User,
  ) {
    return this.contactsService.inviteContactToPlatform(contactId, user.id);
  }

  @Mutation(() => InviteContactResponse)
  resendContactInvitation(
    @Args('contactId', { type: () => ID }) contactId: string,
    @CurrentUser() user: User,
  ) {
    return this.contactsService.resendContactInvitation(contactId, user.id);
  }

  @Query(() => ContactPlatformStatus)
  checkContactOnPlatform(
    @Args('contactId', { type: () => ID }) contactId: string,
    @CurrentUser() user: User,
  ) {
    return this.contactsService.checkContactOnPlatform(contactId, user.id);
  }
}
