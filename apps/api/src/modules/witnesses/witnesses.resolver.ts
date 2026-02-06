import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { WitnessesService } from './witnesses.service';
import { Witness } from './entities/witness.entity';
import { AcknowledgeWitnessInput } from './dto/acknowledge-witness.input';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { WitnessStatus } from '../../generated/prisma/client';
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

  @Query(() => [Witness], { name: 'myWitnessRequests' })
  myWitnessRequests(
    @CurrentUser() user: User,
    @Args('status', { type: () => WitnessStatus, nullable: true })
    status?: WitnessStatus,
  ) {
    return this.witnessesService.findMyRequests(user.id, status);
  }
}
