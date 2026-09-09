import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
  Float,
} from '@nestjs/graphql';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { TransactionAllocation } from './entities/transaction-allocation.entity';
import { TransactionAllocationsService } from './transaction-allocations.service';
import { ProjectTransaction } from '../projects/entities/project-transaction.entity';
import { Organisation } from '../organisations/entities/organisation.entity';
import { AddWitnessInput } from './dto/add-witness.input';
import {
  TransactionsResponse,
  TransactionsSummary,
} from './entities/transactions-response.entity';
import { PaginatedSharedHistoryResponse } from './entities/paginated-shared-history-response.entity';
import { FilterTransactionInput } from './dto/filter-transaction.input';
import { FilterSharedHistoryInput } from './dto/filter-shared-history.input';
import { ContactGroupedSummary } from './entities/contact-grouped-summary.entity';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CheckFeature } from '../subscription/decorators/check-feature.decorator';
import { FeatureLimitInterceptor } from '../subscription/interceptors/feature-limit.interceptor';
import { ActiveOrg } from '../organisations/decorators/active-org.decorator';
import {
  computeOutstanding,
  isLifecycleObligationType,
} from './settlement.util';

@Resolver(() => Transaction)
@UseGuards(GqlAuthGuard)
export class TransactionsResolver {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly allocationsService: TransactionAllocationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * For lifecycle obligation transactions (loans, advances, deposits, escrows
   * and standalone remittances), the unsettled balance = amount − (child
   * amounts + ACTIVE allocations on both legs).
   * Returns null for non-lifecycle or itemised transactions.
   *
   * List paths pre-compute this via `loadSettledAmounts` (3 queries for a whole
   * page) and attach it to each item; the short-circuit below honours that.
   * The per-row fallback still serves `findOne` and any un-preloaded caller.
   * A DataLoader would be the general fix, but there is none in this codebase
   * yet — that belongs in its own change.
   */
  @ResolveField(() => Float, { nullable: true })
  async remainingAmount(
    @Parent() transaction: Transaction,
  ): Promise<number | null> {
    if (!isLifecycleObligationType(transaction.type)) return null;
    if (!transaction.amount) return null;
    if (transaction.remainingAmount !== undefined) {
      return transaction.remainingAmount;
    }

    const settled = await this.transactionsService.loadSettledAmount(
      this.prisma,
      transaction.id,
    );
    return computeOutstanding(transaction.amount, settled);
  }

  /**
   * Credit drawn OUT of this transaction: "this lump sum went to these
   * obligations." Detail query only — never selected on a list page.
   */
  @ResolveField(() => [TransactionAllocation])
  async allocationsOut(@Parent() transaction: Transaction) {
    return this.allocationsService.listForTransaction(transaction.id, 'OUT');
  }

  /** Credit applied IN to this transaction: "settled from that lump sum." */
  @ResolveField(() => [TransactionAllocation])
  async allocationsIn(@Parent() transaction: Transaction) {
    return this.allocationsService.listForTransaction(transaction.id, 'IN');
  }

  /**
   * Populated only when this transaction is linked to a project (either
   * origin direction) AND the viewer is its creator. A linked contact
   * viewing this same row from the flipped shared-ledger perspective never
   * gets project details back — the project may belong entirely to the
   * other party and isn't something the shared-ledger relationship grants
   * access to.
   */
  @ResolveField(() => ProjectTransaction, { nullable: true })
  async projectTransaction(
    @Parent() transaction: Transaction,
    @CurrentUser() user: User,
  ) {
    if (!transaction.projectTransactionId) return null;
    if (transaction.createdById !== user.id) return null;
    return this.prisma.projectTransaction.findUnique({
      where: { id: transaction.projectTransactionId },
      include: { project: true },
    });
  }

  /**
   * Org attribution for personal-mirror rows and org rows alike — resolved
   * on demand rather than requiring every query path to `include` it.
   * Visibility is already enforced upstream: a viewer can only ever reach a
   * transaction with orgId set via `findAll`/`findOne`'s own org-membership
   * scoping, so no extra permission check is needed here.
   */
  @ResolveField(() => Organisation, { nullable: true })
  async organisation(@Parent() transaction: Transaction) {
    if (!transaction.orgId) return null;
    return this.prisma.organisation.findUnique({
      where: { id: transaction.orgId },
    });
  }

  /**
   * Populated only on a personal-ledger mirror row (orgSourceTransactionId
   * set) — points back at the org transaction it reflects, so the frontend
   * can render "On behalf of <org> · <project>" from
   * orgSourceTransaction.organisation / orgSourceTransaction.projectTransaction.
   */
  @ResolveField(() => Transaction, { nullable: true })
  async orgSourceTransaction(@Parent() transaction: Transaction) {
    if (!transaction.orgSourceTransactionId) return null;
    return this.prisma.transaction.findUnique({
      where: { id: transaction.orgSourceTransactionId },
    });
  }

  @Query(() => TransactionsSummary, { name: 'totalBalance' })
  async getTotalBalance(
    @CurrentUser() user: User,
    @ActiveOrg() orgId: string | null,
    @Args('currency', { nullable: true }) currency?: string,
    @Args('filter', { nullable: true }) filter?: FilterTransactionInput,
  ) {
    const summary = await this.transactionsService.findAll(user.id, orgId, {
      ...filter,
      summaryCurrency: currency,
    });
    return summary.summary;
  }

  @Mutation(() => Transaction)
  @CheckFeature('maxWitnessesPerMonth')
  @UseInterceptors(FeatureLimitInterceptor)
  async addWitness(
    @Args('input') addWitnessInput: AddWitnessInput,
    @CurrentUser() user: User,
    @ActiveOrg() orgId: string | null,
  ) {
    return this.transactionsService.addWitness(addWitnessInput, user.id, orgId);
  }

  @Query(() => TransactionsResponse, { name: 'transactions' })
  async findAll(
    @CurrentUser() user: User,
    @ActiveOrg() orgId: string | null,
    @Args('filter', { nullable: true }) filter?: FilterTransactionInput,
  ) {
    return this.transactionsService.findAll(user.id, orgId, filter);
  }

  @Query(() => PaginatedSharedHistoryResponse, {
    name: 'myContactTransactions',
  })
  async findMyContactTransactions(
    @CurrentUser() user: User,
    @Args('filter', { nullable: true }) filter?: FilterSharedHistoryInput,
  ) {
    return this.transactionsService.findMyContactTransactions(user.id, filter);
  }

  @Query(() => [ContactGroupedSummary], {
    name: 'transactionsGroupedByContact',
  })
  @CheckFeature('allowAdvancedAnalytics')
  @UseInterceptors(FeatureLimitInterceptor)
  async groupByContact(
    @CurrentUser() user: User,
    @Args('filter', { nullable: true }) filter?: FilterTransactionInput,
  ) {
    return this.transactionsService.groupByContact(user.id, filter);
  }

  @Query(() => Transaction, { name: 'transaction' })
  async findOne(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
    @ActiveOrg() orgId: string | null,
  ) {
    return this.transactionsService.findOne(id, user.id, orgId, true);
  }

  @Mutation(() => Transaction)
  async removeTransaction(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
    @ActiveOrg() orgId: string | null,
  ) {
    return this.transactionsService.remove(id, user.id, orgId);
  }
}
