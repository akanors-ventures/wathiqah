import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveOrg } from '../organisations/decorators/active-org.decorator';
import { User } from '../users/entities/user.entity';
import { Transaction } from './entities/transaction.entity';
import { TransactionAllocation } from './entities/transaction-allocation.entity';
import { AllocateTransactionsInput } from './dto/allocate-transactions.input';
import { TransactionAllocationsService } from './transaction-allocations.service';

@Resolver(() => TransactionAllocation)
@UseGuards(GqlAuthGuard)
export class TransactionAllocationsResolver {
  constructor(private readonly allocations: TransactionAllocationsService) {}

  /**
   * Applies one credit pool across several obligations in a single atomic
   * pass. Creates no Transaction rows.
   */
  @Mutation(() => [TransactionAllocation])
  async allocateTransactions(
    @Args('input') input: AllocateTransactionsInput,
    @CurrentUser() user: User,
    @ActiveOrg() orgId: string | null,
  ) {
    return this.allocations.allocate(input, user.id, orgId);
  }

  @Mutation(() => TransactionAllocation)
  async reverseTransactionAllocation(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
    @ActiveOrg() orgId: string | null,
  ) {
    return this.allocations.reverse(id, user.id, orgId);
  }

  /** Credit pools with something left to apply. */
  @Query(() => [Transaction])
  async availableCredits(
    @CurrentUser() user: User,
    @ActiveOrg() orgId: string | null,
    @Args('contactId', { type: () => ID, nullable: true }) contactId?: string,
    @Args('currency', { nullable: true }) currency?: string,
  ) {
    return this.allocations.availableCredits(
      user.id,
      orgId,
      contactId,
      currency,
    );
  }

  /** Obligations the given credit may legally settle. */
  @Query(() => [Transaction])
  async allocatableObligations(
    @Args('sourceTransactionId', { type: () => ID })
    sourceTransactionId: string,
    @CurrentUser() user: User,
    @ActiveOrg() orgId: string | null,
    @Args('contactId', { type: () => ID, nullable: true }) contactId?: string,
  ) {
    return this.allocations.allocatableObligations(
      sourceTransactionId,
      user.id,
      orgId,
      contactId,
    );
  }
}
