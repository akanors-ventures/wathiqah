import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Float,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ProjectsService } from './projects.service';
import { ProjectTransactionsService } from './project-transactions.service';
import { Project } from './entities/project.entity';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { LogProjectTransactionInput } from './dto/log-project-transaction.input';
import { UpdateProjectTransactionInput } from './dto/update-project-transaction.input';
import { FilterProjectInput } from './dto/filter-project.input';
import { FilterProjectTransactionInput } from './dto/filter-project-transaction.input';
import { PaginatedProjectsResponse } from './entities/paginated-projects-response.entity';
import { PaginatedProjectTransactionsResponse } from './entities/paginated-project-transactions-response.entity';
import { ProjectTransaction } from './entities/project-transaction.entity';

@Resolver(() => Project)
@UseGuards(GqlAuthGuard)
export class ProjectsResolver {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectTransactionsService: ProjectTransactionsService,
  ) {}

  @Query(() => PaginatedProjectsResponse, { name: 'myProjects' })
  async myProjects(
    @CurrentUser() user: User,
    @Args('filter', { nullable: true }) filter?: FilterProjectInput,
  ) {
    return this.projectsService.findAll(user.id, filter);
  }

  @Query(() => Project, { name: 'project' })
  async project(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.findOne(id, user.id);
  }

  @Mutation(() => Project)
  async createProject(
    @CurrentUser() user: User,
    @Args('input') input: CreateProjectInput,
  ) {
    return this.projectsService.create(user.id, input);
  }

  @Mutation(() => Project)
  async updateProject(
    @CurrentUser() user: User,
    @Args('input') input: UpdateProjectInput,
  ) {
    return this.projectsService.update(user.id, input);
  }

  @Mutation(() => ProjectTransaction)
  async logProjectTransaction(
    @CurrentUser() user: User,
    @Args('input') input: LogProjectTransactionInput,
  ) {
    return this.projectTransactionsService.create(user.id, input);
  }

  @ResolveField(() => Float, { defaultValue: 0 })
  async totalIncome(@Parent() project: Project): Promise<number> {
    const { totalIncome } = await this.projectsService.getTransactionTotals(
      project.id,
    );
    return totalIncome;
  }

  @ResolveField(() => Float, { defaultValue: 0 })
  async totalExpenses(@Parent() project: Project): Promise<number> {
    const { totalExpenses } = await this.projectsService.getTransactionTotals(
      project.id,
    );
    return totalExpenses;
  }

  @Mutation(() => ProjectTransaction)
  async updateProjectTransaction(
    @CurrentUser() user: User,
    @Args('input') input: UpdateProjectTransactionInput,
  ) {
    return this.projectTransactionsService.update(user.id, input);
  }

  @ResolveField(() => PaginatedProjectTransactionsResponse)
  async transactions(
    @Parent() project: Project,
    @Args('filter', { nullable: true }) filter?: FilterProjectTransactionInput,
  ): Promise<PaginatedProjectTransactionsResponse> {
    return this.projectTransactionsService.findByProject(project.id, filter);
  }
}
