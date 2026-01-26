import {
  Resolver,
  Query,
  Args,
  ResolveField,
  Parent,
  Mutation,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { WitnessCandidate } from './entities/witness-candidate.entity';
import { SearchWitnessInput } from './dto/search-witness.input';
import { UpdateUserInput } from './dto/update-user.input';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @ResolveField(() => String)
  name(@Parent() user: User): string {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  @Query(() => User, { name: 'me' })
  @UseGuards(GqlAuthGuard)
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Query(() => User, { name: 'user', nullable: true })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.usersService.findOne(id);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  updateUser(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @CurrentUser() user: User,
  ) {
    return this.usersService.update(user.id, updateUserInput);
  }

  @Query(() => WitnessCandidate, { name: 'searchWitness', nullable: true })
  @UseGuards(GqlAuthGuard)
  async searchWitness(
    @Args('input') input: SearchWitnessInput,
  ): Promise<WitnessCandidate | null> {
    return this.usersService.searchWitness(input.query, input.type);
  }
}
