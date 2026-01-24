import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { WitnessesService } from './witnesses.service';
import { Witness } from './entities/witness.entity';
import { AcknowledgeWitnessInput } from './dto/acknowledge-witness.input';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { WitnessStatus } from '../../generated/prisma/client';

@Resolver(() => Witness)
@UseGuards(GqlAuthGuard)
export class WitnessesResolver {
  constructor(private readonly witnessesService: WitnessesService) {}

  @Mutation(() => Witness)
  acknowledgeWitness(
    @Args('input') input: AcknowledgeWitnessInput,
    @CurrentUser() user: User,
  ) {
    return this.witnessesService.acknowledge(
      input.witnessId,
      input.status,
      user.id,
    );
  }

  @Query(() => [Witness], { name: 'myWitnessRequests' })
  myWitnessRequests(
    @CurrentUser() user: User,
    @Args('status', { type: () => WitnessStatus, nullable: true })
    status?: WitnessStatus,
  ) {
    return this.witnessesService.findMyRequests(user.id, status);
  }
}
