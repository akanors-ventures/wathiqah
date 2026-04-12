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
import { AddWitnessInput } from './dto/add-witness.input';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { UpdateTransactionInput } from './dto/update-transaction.input';
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

@Resolver(() => Transaction)
@UseGuards(GqlAuthGuard)
export class TransactionsResolver {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * For lifecycle parent transactions (loans + escrows), the unsettled
   * balance = parent.amount − Σ (non-cancelled child amounts).
   * Returns null for non-lifecycle or itemised transactions.
   */
  @ResolveField(() => Float, { nullable: true })
  async remainingAmount(
    @Parent() transaction: Transaction,
  ): Promise<number | null> {
    if (
      transaction.type !== 'LOAN_GIVEN' &&
      transaction.type !== 'LOAN_RECEIVED' &&
      transaction.type !== 'ESCROWED'
    ) {
      return null;
    }
    if (!transaction.amount) return null;

    const children = await this.prisma.transaction.findMany({
      where: {
        parentId: transaction.id,
        status: { not: 'CANCELLED' },
      },
      select: { amount: true },
    });
    const settled = children.reduce(
      (sum, child) => sum + (child.amount ? Number(child.amount) : 0),
      0,
    );
    return Math.max(0, Number(transaction.amount) - settled);
  }

  @Query(() => TransactionsSummary, { name: 'totalBalance' })
  async getTotalBalance(
    @CurrentUser() user: User,
    @Args('currency', { nullable: true }) currency?: string,
    @Args('filter', { nullable: true }) filter?: FilterTransactionInput,
  ) {
    const summary = await this.transactionsService.findAll(user.id, {
      ...filter,
      summaryCurrency: currency,
    });
    return summary.summary;
  }

  @Mutation(() => Transaction)
  @CheckFeature('maxWitnessesPerMonth')
  @UseInterceptors(FeatureLimitInterceptor)
  async createTransaction(
    @Args('input') createTransactionInput: CreateTransactionInput,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.create(createTransactionInput, user.id);
  }

  @Mutation(() => Transaction)
  @CheckFeature('maxWitnessesPerMonth')
  @UseInterceptors(FeatureLimitInterceptor)
  async addWitness(
    @Args('input') addWitnessInput: AddWitnessInput,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.addWitness(addWitnessInput, user.id);
  }

  @Query(() => TransactionsResponse, { name: 'transactions' })
  async findAll(
    @CurrentUser() user: User,
    @Args('filter', { nullable: true }) filter?: FilterTransactionInput,
  ) {
    return this.transactionsService.findAll(user.id, filter);
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
  ) {
    return this.transactionsService.findOne(id, user.id, true);
  }

  @Mutation(() => Transaction)
  @CheckFeature('maxWitnessesPerMonth')
  @UseInterceptors(FeatureLimitInterceptor)
  async updateTransaction(
    @Args('input') updateTransactionInput: UpdateTransactionInput,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.update(
      updateTransactionInput.id,
      updateTransactionInput,
      user.id,
    );
  }

  @Mutation(() => Transaction)
  async removeTransaction(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.remove(id, user.id);
  }
}
