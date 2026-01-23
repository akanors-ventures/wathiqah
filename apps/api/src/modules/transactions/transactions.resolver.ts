import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { UpdateTransactionInput } from './dto/update-transaction.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Resolver(() => Transaction)
@UseGuards(GqlAuthGuard)
export class TransactionsResolver {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Mutation(() => Transaction)
  async createTransaction(
    @Args('input') createTransactionInput: CreateTransactionInput,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.create(createTransactionInput, user.id);
  }

  @Query(() => [Transaction], { name: 'transactions' })
  async findAll(@CurrentUser() user: User) {
    return this.transactionsService.findAll(user.id);
  }

  @Query(() => Transaction, { name: 'transaction' })
  async findOne(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.findOne(id, user.id);
  }

  @Mutation(() => Transaction)
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
}
