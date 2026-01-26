import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { SharedAccessService } from './shared-access.service';
import { AccessGrant } from './entities/access-grant.entity';
import { SharedDataEntity } from './entities/shared-data.entity';
import { GrantAccessInput } from './dto/grant-access.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../generated/prisma/client';

@Resolver(() => AccessGrant)
export class SharedAccessResolver {
  constructor(private readonly sharedAccessService: SharedAccessService) {}

  @Mutation(() => AccessGrant)
  @UseGuards(GqlAuthGuard)
  grantAccess(
    @Args('grantAccessInput') grantAccessInput: GrantAccessInput,
    @CurrentUser() user: User,
  ) {
    return this.sharedAccessService.grantAccess(
      grantAccessInput,
      user.id,
      `${user.firstName} ${user.lastName}`,
    );
  }

  @Mutation(() => AccessGrant)
  @UseGuards(GqlAuthGuard)
  revokeAccess(@Args('id') id: string, @CurrentUser() user: User) {
    return this.sharedAccessService.revokeAccess(id, user.id);
  }

  @Mutation(() => AccessGrant)
  @UseGuards(GqlAuthGuard)
  acceptAccess(@Args('token') token: string, @CurrentUser() user: User) {
    return this.sharedAccessService.acceptAccess(token, user.email);
  }

  @Query(() => [AccessGrant], { name: 'myAccessGrants' })
  @UseGuards(GqlAuthGuard)
  findAll(@CurrentUser() user: User) {
    return this.sharedAccessService.findAll(user.id);
  }

  @Query(() => [AccessGrant], { name: 'receivedAccessGrants' })
  @UseGuards(GqlAuthGuard)
  findReceived(@CurrentUser() user: User) {
    return this.sharedAccessService.findReceived(user.email);
  }

  @Query(() => SharedDataEntity, { name: 'sharedData' })
  @UseGuards(GqlAuthGuard)
  getSharedData(@Args('grantId') grantId: string, @CurrentUser() user: User) {
    return this.sharedAccessService.getSharedData(grantId, user.email);
  }
}
