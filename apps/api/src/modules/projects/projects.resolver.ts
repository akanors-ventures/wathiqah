import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
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
import { ProjectTransaction } from './entities/project-transaction.entity';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { LogProjectTransactionInput } from './dto/log-project-transaction.input';

@Resolver(() => Project)
@UseGuards(GqlAuthGuard)
export class ProjectsResolver {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly projectTransactionsService: ProjectTransactionsService,
  ) {}

  @Query(() => [Project], { name: 'myProjects' })
  async myProjects(@CurrentUser() user: User) {
    return this.projectsService.findAll(user.id);
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

  @ResolveField(() => [ProjectTransaction])
  async transactions(@Parent() project: Project, @CurrentUser() user: User) {
    return this.projectTransactionsService.findAllByProject(
      user.id,
      project.id,
    );
  }
}
