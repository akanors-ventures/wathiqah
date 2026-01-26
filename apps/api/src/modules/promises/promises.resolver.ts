import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { PromisesService } from './promises.service';
import { Promise } from './entities/promise.entity';
import { CreatePromiseInput } from './dto/create-promise.input';
import { UpdatePromiseInput } from './dto/update-promise.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../generated/prisma/client';

@Resolver(() => Promise)
@UseGuards(GqlAuthGuard)
export class PromisesResolver {
  constructor(private readonly promisesService: PromisesService) {}

  @Mutation(() => Promise)
  createPromise(
    @Args('createPromiseInput') createPromiseInput: CreatePromiseInput,
    @CurrentUser() user: User,
  ) {
    return this.promisesService.create(createPromiseInput, user.id);
  }

  @Query(() => [Promise], { name: 'myPromises' })
  findAll(@CurrentUser() user: User) {
    return this.promisesService.findAll(user.id);
  }

  @Query(() => Promise, { name: 'promise' })
  findOne(@Args('id') id: string, @CurrentUser() user: User) {
    return this.promisesService.findOne(id, user.id);
  }

  @Mutation(() => Promise)
  updatePromise(
    @Args('updatePromiseInput') updatePromiseInput: UpdatePromiseInput,
    @CurrentUser() user: User,
  ) {
    return this.promisesService.update(
      updatePromiseInput.id,
      updatePromiseInput,
      user.id,
    );
  }

  @Mutation(() => Promise)
  removePromise(@Args('id') id: string, @CurrentUser() user: User) {
    return this.promisesService.remove(id, user.id);
  }
}
