import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import {
  OrgRolesGuard,
  OrgRoles,
} from '../organisations/guards/org-roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveOrg } from '../organisations/decorators/active-org.decorator';
import { OrgEventsService } from './org-events.service';
import { OrgEvent } from './entities/org-event.entity';
import { CreateOrgEventInput } from './dto/create-org-event.input';
import { UpdateOrgEventInput } from './dto/update-org-event.input';
import { OrgRole } from '../../generated/prisma/client';
import { User } from '../users/entities/user.entity';

@Resolver(() => OrgEvent)
@UseGuards(GqlAuthGuard, OrgRolesGuard)
export class OrgEventsResolver {
  constructor(private readonly orgEventsService: OrgEventsService) {}

  @Mutation(() => OrgEvent)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  createOrgEvent(
    @Args('input') input: CreateOrgEventInput,
    @ActiveOrg() orgId: string,
    @CurrentUser() user: User,
  ) {
    return this.orgEventsService.create(input, orgId, user.id);
  }

  @Query(() => [OrgEvent], { name: 'orgUpcomingEvents' })
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  findUpcoming(
    @ActiveOrg() orgId: string,
    @Args('category', { nullable: true }) category?: string,
  ) {
    return this.orgEventsService.findUpcoming(orgId, category);
  }

  @Query(() => [OrgEvent], { name: 'orgEvents' })
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  findAll(
    @ActiveOrg() orgId: string,
    @Args('category', { nullable: true }) category?: string,
  ) {
    return this.orgEventsService.findAll(orgId, category);
  }

  @Query(() => [String], { name: 'orgEventCategorySuggestions' })
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  categorySuggestions(@ActiveOrg() orgId: string) {
    return this.orgEventsService.usedCategories(orgId);
  }

  @Mutation(() => OrgEvent)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  updateOrgEvent(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateOrgEventInput,
    @ActiveOrg() orgId: string,
  ) {
    return this.orgEventsService.update(id, input, orgId);
  }

  @Mutation(() => Boolean)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  removeOrgEvent(
    @Args('id', { type: () => ID }) id: string,
    @ActiveOrg() orgId: string,
  ) {
    return this.orgEventsService.remove(id, orgId);
  }
}
