import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserNotesService } from './user-notes.service';
import { UserNote } from './entities/user-note.entity';
import { CreateUserNoteInput } from './dto/create-user-note.input';
import { UpdateUserNoteInput } from './dto/update-user-note.input';
import { CheckFeature } from '../subscription/decorators/check-feature.decorator';
import { FeatureLimitInterceptor } from '../subscription/interceptors/feature-limit.interceptor';
import { User } from '../users/entities/user.entity';

@Resolver(() => UserNote)
@UseGuards(GqlAuthGuard)
export class UserNotesResolver {
  constructor(private readonly userNotesService: UserNotesService) {}

  @Mutation(() => UserNote)
  @CheckFeature('maxNotesPerMonth')
  @UseInterceptors(FeatureLimitInterceptor)
  createUserNote(
    @Args('input') input: CreateUserNoteInput,
    @CurrentUser() user: User,
  ) {
    return this.userNotesService.create(input, user.id);
  }

  @Query(() => [UserNote], { name: 'userNotes' })
  findAll(
    @CurrentUser() user: User,
    @Args('category', { nullable: true }) category?: string,
  ) {
    return this.userNotesService.findAll(user.id, category);
  }

  @Mutation(() => UserNote)
  updateUserNote(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserNoteInput,
    @CurrentUser() user: User,
  ) {
    return this.userNotesService.update(id, input, user.id);
  }

  @Mutation(() => Boolean)
  removeUserNote(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.userNotesService.remove(id, user.id);
  }
}
