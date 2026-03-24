import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { WitnessesService } from './witnesses.service';
import { Witness } from './entities/witness.entity';
import { PaginatedWitnessesResponse } from './entities/paginated-witnesses-response.entity';
import { AcknowledgeWitnessInput } from './dto/acknowledge-witness.input';
import { FilterWitnessInput } from './dto/filter-witness.input';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AuthService } from '../auth/auth.service';

@Resolver(() => Witness)
@UseGuards(GqlAuthGuard)
export class WitnessesResolver {
  constructor(
    private readonly witnessesService: WitnessesService,
    private readonly authService: AuthService,
  ) {}

  @Mutation(() => Witness)
  async acknowledgeWitness(
    @Args('input') input: AcknowledgeWitnessInput,
    @CurrentUser() user: User,
  ) {
    let witnessId = input.witnessId;

    if (!witnessId && input.token) {
      const witness = await this.authService.getWitnessInvitation(input.token);
      witnessId = witness.id;
    }

    if (!witnessId) {
      throw new BadRequestException(
        'Either witnessId or token must be provided',
      );
    }

    return this.witnessesService.acknowledge(witnessId, input.status, user.id);
  }

  @Mutation(() => Witness)
  resendWitnessInvitation(
    @Args('witnessId', { type: () => ID }) witnessId: string,
    @CurrentUser() user: User,
  ) {
    return this.witnessesService.resendInvitation(witnessId, user.id);
  }

  @Mutation(() => Witness)
  removeWitness(
    @Args('witnessId', { type: () => ID }) witnessId: string,
    @CurrentUser() user: User,
  ) {
    return this.witnessesService.removeWitness(witnessId, user.id);
  }

  @Query(() => PaginatedWitnessesResponse, { name: 'myWitnessRequests' })
  myWitnessRequests(
    @CurrentUser() user: User,
    @Args('filter', { nullable: true }) filter?: FilterWitnessInput,
  ) {
    return this.witnessesService.findMyRequests(user.id, filter);
  }
}
