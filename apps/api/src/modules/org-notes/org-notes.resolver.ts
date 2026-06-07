import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import {
  OrgRolesGuard,
  OrgRoles,
} from '../organisations/guards/org-roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveOrg } from '../organisations/decorators/active-org.decorator';
import { OrgNotesService } from './org-notes.service';
import { OrgNote } from './entities/org-note.entity';
import { CreateOrgNoteInput } from './dto/create-org-note.input';
import { UpdateOrgNoteInput } from './dto/update-org-note.input';
import { OrgRole } from '../../generated/prisma/client';
import { User } from '../users/entities/user.entity';

@Resolver(() => OrgNote)
@UseGuards(GqlAuthGuard, OrgRolesGuard)
export class OrgNotesResolver {
  constructor(private readonly orgNotesService: OrgNotesService) {}

  @Mutation(() => OrgNote)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  createOrgNote(
    @Args('input') input: CreateOrgNoteInput,
    @ActiveOrg() orgId: string,
    @CurrentUser() user: User,
  ) {
    return this.orgNotesService.create(input, orgId, user.id);
  }

  @Query(() => [OrgNote], { name: 'orgNotes' })
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  findAll(
    @ActiveOrg() orgId: string,
    @Args('category', { nullable: true }) category?: string,
  ) {
    return this.orgNotesService.findAll(orgId, category);
  }

  @Mutation(() => OrgNote)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  updateOrgNote(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateOrgNoteInput,
    @ActiveOrg() orgId: string,
  ) {
    return this.orgNotesService.update(id, input, orgId);
  }

  @Mutation(() => Boolean)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  removeOrgNote(
    @Args('id', { type: () => ID }) id: string,
    @ActiveOrg() orgId: string,
  ) {
    return this.orgNotesService.remove(id, orgId);
  }
}
