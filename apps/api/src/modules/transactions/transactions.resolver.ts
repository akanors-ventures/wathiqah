import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { UseGuards } from '@nestjs/common';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // (Mocked for now)

@Resolver(() => Transaction)
export class TransactionsResolver {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Mutation(() => Transaction)
    @UseGuards(/* JwtAuthGuard */)
    async createTransaction(
        @Args('input') createTransactionInput: CreateTransactionInput,
        @Context() context,
    ) {
        // Mock user ID until Auth is implemented
        const userId = context.req?.user?.id || 'mock-user-id';
        return this.transactionsService.create(createTransactionInput, userId);
    }

    @Query(() => [Transaction], { name: 'transactions' })
    @UseGuards(/* JwtAuthGuard */)
    async findAll(@Context() context) {
        const userId = context.req?.user?.id || 'mock-user-id';
        return this.transactionsService.findAll(userId);
    }
}
