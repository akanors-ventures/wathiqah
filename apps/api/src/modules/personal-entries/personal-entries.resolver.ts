import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PersonalEntriesService } from './personal-entries.service';
import { PersonalEntry } from './entities/personal-entry.entity';
import { PersonalEntrySummary } from './entities/personal-entry-summary.entity';
import { PaginatedPersonalEntriesResponse } from './entities/paginated-personal-entries-response.entity';
import { CreatePersonalEntryInput } from './dto/create-personal-entry.input';
import { UpdatePersonalEntryInput } from './dto/update-personal-entry.input';
import { FilterPersonalEntryInput } from './dto/filter-personal-entry.input';

@Resolver(() => PersonalEntry)
@UseGuards(GqlAuthGuard)
export class PersonalEntriesResolver {
  constructor(private readonly service: PersonalEntriesService) {}

  @Query(() => PaginatedPersonalEntriesResponse, { name: 'personalEntries' })
  async personalEntries(
    @CurrentUser() user: User,
    @Args('filter', { nullable: true }) filter?: FilterPersonalEntryInput,
  ) {
    return this.service.findAll(user.id, filter);
  }

  @Query(() => PersonalEntrySummary, { name: 'personalEntrySummary' })
  async personalEntrySummary(
    @CurrentUser() user: User,
    @Args('filter', { nullable: true }) filter?: FilterPersonalEntryInput,
  ) {
    return this.service.getSummary(user.id, filter);
  }

  @Mutation(() => PersonalEntry)
  async createPersonalEntry(
    @CurrentUser() user: User,
    @Args('input') input: CreatePersonalEntryInput,
  ) {
    return this.service.create(user.id, input);
  }

  @Mutation(() => PersonalEntry)
  async updatePersonalEntry(
    @CurrentUser() user: User,
    @Args('input') input: UpdatePersonalEntryInput,
  ) {
    return this.service.update(user.id, input);
  }

  @Mutation(() => Boolean)
  async deletePersonalEntry(
    @CurrentUser() user: User,
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}
