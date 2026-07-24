import { Resolver, ResolveField, Parent, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectTransaction } from './entities/project-transaction.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

@Resolver(() => ProjectTransaction)
@UseGuards(GqlAuthGuard)
export class ProjectTransactionsResolver {
  constructor(private readonly prisma: PrismaService) {}

  @ResolveField(() => Contact, { nullable: true })
  async contact(@Parent() projectTransaction: ProjectTransaction) {
    if (projectTransaction.contact) return projectTransaction.contact;
    if (!projectTransaction.contactId) return null;
    return this.prisma.contact.findUnique({
      where: { id: projectTransaction.contactId },
    });
  }

  @ResolveField(() => Transaction, { nullable: true })
  async transaction(@Parent() projectTransaction: ProjectTransaction) {
    if (projectTransaction.transaction) return projectTransaction.transaction;
    return this.prisma.transaction.findUnique({
      where: { projectTransactionId: projectTransaction.id },
    });
  }

  @ResolveField(() => ID, { nullable: true })
  async transactionId(
    @Parent() projectTransaction: ProjectTransaction,
  ): Promise<string | null> {
    if (projectTransaction.transaction) {
      return projectTransaction.transaction.id;
    }
    const linked = await this.prisma.transaction.findUnique({
      where: { projectTransactionId: projectTransaction.id },
      select: { id: true },
    });
    return linked?.id ?? null;
  }
}
