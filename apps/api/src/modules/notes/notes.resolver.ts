import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import {
  OrgRolesGuard,
  OrgRoles,
} from '../organisations/guards/org-roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveOrg } from '../organisations/decorators/active-org.decorator';
import { CheckFeature } from '../subscription/decorators/check-feature.decorator';
import { FeatureLimitInterceptor } from '../subscription/interceptors/feature-limit.interceptor';
import { NotesService } from './notes.service';
import { Note } from './entities/note.entity';
import { CreateNoteInput } from './dto/create-note.input';
import { UpdateNoteInput } from './dto/update-note.input';
import { OrgRole } from '../../generated/prisma/client';
import { User } from '../users/entities/user.entity';

@Resolver(() => Note)
@UseGuards(GqlAuthGuard)
export class NotesResolver {
  constructor(private readonly notesService: NotesService) {}

  // ── Org notes ─────────────────────────────────────────────────────────────

  @Mutation(() => Note)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  createOrgNote(
    @Args('input') input: CreateNoteInput,
    @ActiveOrg() orgId: string,
    @CurrentUser() user: User,
  ) {
    return this.notesService.create(input, user.id, orgId);
  }

  @Query(() => [Note], { name: 'orgNotes' })
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  findOrgNotes(
    @ActiveOrg() orgId: string,
    @Args('category', { nullable: true }) category?: string,
  ) {
    return this.notesService.findByOrg(orgId, category);
  }

  @Mutation(() => Note)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  updateOrgNote(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateNoteInput,
    @ActiveOrg() orgId: string,
  ) {
    return this.notesService.updateOrgNote(id, input, orgId);
  }

  @Mutation(() => Boolean)
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR)
  removeOrgNote(
    @Args('id', { type: () => ID }) id: string,
    @ActiveOrg() orgId: string,
  ) {
    return this.notesService.removeOrgNote(id, orgId);
  }

  // ── Personal notes ─────────────────────────────────────────────────────────

  @Mutation(() => Note)
  @CheckFeature('maxNotesPerMonth')
  @UseInterceptors(FeatureLimitInterceptor)
  createNote(@Args('input') input: CreateNoteInput, @CurrentUser() user: User) {
    return this.notesService.create(input, user.id);
  }

  @Query(() => [Note], { name: 'userNotes' })
  findUserNotes(
    @CurrentUser() user: User,
    @Args('category', { nullable: true }) category?: string,
  ) {
    return this.notesService.findByUser(user.id, category);
  }

  // ── Shared mutations (ownership-checked) ───────────────────────────────────

  @Mutation(() => Note)
  updateNote(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateNoteInput,
    @CurrentUser() user: User,
  ) {
    return this.notesService.update(id, input, user.id);
  }

  @Mutation(() => Boolean)
  removeNote(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.notesService.remove(id, user.id);
  }
}
