import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { OrgRolesGuard, OrgRoles } from './guards/org-roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveOrg } from './decorators/active-org.decorator';
import { OrganisationsService } from './organisations.service';
import { Organisation } from './entities/organisation.entity';
import { OrganisationMember } from './entities/organisation-member.entity';
import { CreateOrganisationInput } from './dto/create-organisation.input';
import { UpdateOrganisationInput } from './dto/update-organisation.input';
import { InviteMemberInput } from './dto/invite-member.input';
import { OrgRole } from '../../generated/prisma/client';
import { User } from '../users/entities/user.entity';
import { Contact } from '../contacts/entities/contact.entity';

@Resolver(() => Organisation)
@UseGuards(GqlAuthGuard)
export class OrganisationsResolver {
  constructor(private readonly orgsService: OrganisationsService) {}

  @Mutation(() => Organisation)
  createOrganisation(
    @Args('input') input: CreateOrganisationInput,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.create(input, user.id);
  }

  @Query(() => Organisation, { name: 'organisation' })
  findOrganisation(@Args('slug') slug: string, @CurrentUser() user: User) {
    return this.orgsService.findBySlug(slug, user.id);
  }

  @Query(() => [Organisation], { name: 'myOrganisations' })
  myOrganisations(@CurrentUser() user: User) {
    return this.orgsService.findUserOrgs(user.id);
  }

  @Mutation(() => Organisation)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN)
  updateOrganisation(
    @ActiveOrg() orgId: string,
    @Args('input') input: UpdateOrganisationInput,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.update(orgId, input, user.id);
  }

  @Mutation(() => OrganisationMember)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN)
  inviteMember(
    @ActiveOrg() orgId: string,
    @Args('input') input: InviteMemberInput,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.inviteMember(orgId, input, user.id);
  }

  @Mutation(() => OrganisationMember)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN)
  updateMemberRole(
    @Args('memberId', { type: () => ID }) memberId: string,
    @Args('role', { type: () => OrgRole }) role: OrgRole,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.updateMemberRole(memberId, role, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN)
  removeMember(
    @Args('memberId', { type: () => ID }) memberId: string,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.removeMember(memberId, user.id);
  }

  @Mutation(() => Contact)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  promoteContactToOrg(
    @Args('contactId', { type: () => ID }) contactId: string,
    @ActiveOrg() orgId: string,
    @CurrentUser() user: User,
  ) {
    return this.orgsService.promoteContactToOrg(contactId, orgId, user.id);
  }
}
