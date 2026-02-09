import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { AddWitnessInput } from './dto/add-witness.input';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { UpdateTransactionInput } from './dto/update-transaction.input';
import {
  TransactionsResponse,
  TransactionsSummary,
} from './entities/transactions-response.entity';
import { FilterTransactionInput } from './dto/filter-transaction.input';
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
  constructor(private readonly transactionsService: TransactionsService) {}

  @Query(() => TransactionsSummary, { name: 'totalBalance' })
  async getTotalBalance(
    @CurrentUser() user: User,
    @Args('currency', { nullable: true }) currency?: string,
  ) {
    const summary = await this.transactionsService.findAll(user.id, {
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

  @Query(() => [Transaction], { name: 'myContactTransactions' })
  async findMyContactTransactions(@CurrentUser() user: User) {
    return this.transactionsService.findMyContactTransactions(user.id);
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
