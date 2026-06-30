import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  ID,
} from '@nestjs/graphql';
import { UseGuards, UseInterceptors, Inject } from '@nestjs/common';
import type { PubSub } from 'graphql-subscriptions';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import {
  OrgRolesGuard,
  OrgRoles,
} from '../organisations/guards/org-roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveOrg } from '../organisations/decorators/active-org.decorator';
import { CheckFeature } from '../subscription/decorators/check-feature.decorator';
import { FeatureLimitInterceptor } from '../subscription/interceptors/feature-limit.interceptor';
import { PUB_SUB } from '../../common/pubsub/pubsub.module';
import { NotesService } from './notes.service';
import { Note } from './entities/note.entity';
import { CreateNoteInput } from './dto/create-note.input';
import { UpdateNoteInput } from './dto/update-note.input';
import { OrgRole } from '../../generated/prisma/client';
import { User } from '../users/entities/user.entity';

interface GqlSubscriptionContext {
  req: { user?: { activeOrgId?: string | null } };
}

const sameOrgFilter = (
  payload: { orgId: string },
  _variables: unknown,
  context: GqlSubscriptionContext,
) => payload.orgId === context.req.user?.activeOrgId;

@Resolver(() => Note)
@UseGuards(GqlAuthGuard)
export class NotesResolver {
  constructor(
    private readonly notesService: NotesService,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  // ── Org note live updates ───────────────────────────────────────────────
  // Scoped to the subscriber's activeOrgId (from their JWT at connection
  // time) via `sameOrgFilter`, so members only receive events for the org
  // they're currently viewing.

  @Subscription(() => Note, { filter: sameOrgFilter })
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  orgNoteCreated() {
    return this.pubSub.asyncIterableIterator('orgNoteCreated');
  }

  @Subscription(() => Note, { filter: sameOrgFilter })
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  orgNoteUpdated() {
    return this.pubSub.asyncIterableIterator('orgNoteUpdated');
  }

  @Subscription(() => ID, { filter: sameOrgFilter })
  @UseGuards(OrgRolesGuard)
  @OrgRoles(OrgRole.ADMIN, OrgRole.OPERATOR, OrgRole.VIEWER)
  orgNoteRemoved() {
    return this.pubSub.asyncIterableIterator('orgNoteRemoved');
  }

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
  @CheckFeature('maxNotes')
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
