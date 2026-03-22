import { Resolver, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../generated/prisma/client';
import { ProvisionProInput } from './dto/provision-pro.input';
import { SetUserRoleInput } from './dto/set-user-role.input';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminResolver {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  @Mutation(() => User)
  async provisionPro(
    @CurrentUser() admin: User,
    @Args('input') input: ProvisionProInput,
  ): Promise<User> {
    const user = await this.adminService.provisionPro(
      admin.id,
      input.userId,
      input.expiresAt,
    );
    return this.usersService.toEntity(user);
  }

  @Mutation(() => User)
  async deprovisionPro(
    @CurrentUser() admin: User,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<User> {
    const user = await this.adminService.deprovisionPro(admin.id, userId);
    return this.usersService.toEntity(user);
  }

  @Mutation(() => User)
  async setUserRole(
    @CurrentUser() admin: User,
    @Args('input') input: SetUserRoleInput,
  ): Promise<User> {
    const user = await this.adminService.setUserRole(
      admin.id,
      input.userId,
      input.role,
    );
    return this.usersService.toEntity(user);
  }
}
