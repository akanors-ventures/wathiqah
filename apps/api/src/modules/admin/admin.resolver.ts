import { Resolver, Mutation, Query, Args, ID } from '@nestjs/graphql';
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
import { AdminUsersFilterInput } from './dto/admin-users-filter.input';
import { AdminAuditLogFilterInput } from './dto/admin-audit-log-filter.input';
import { PaginatedUsersResponse } from './entities/paginated-users-response.entity';
import { AdminStats } from './entities/admin-stats.entity';
import { PaginatedAuditLogsResponse } from './entities/paginated-audit-logs-response.entity';

/**
 * Platform administration surface.
 *
 * Read queries and PRO provisioning are open to ADMIN and SUPER_ADMIN.
 * Role management (`setUserRole`) stays SUPER_ADMIN-only — an ADMIN must not be
 * able to promote themselves or others. RolesGuard already treats SUPER_ADMIN
 * as satisfying any `@Roles` requirement.
 *
 * The class-level `@Roles` below is a safety-net default: RolesGuard allows any
 * authenticated user through a handler with no `@Roles` metadata at all, so a
 * future method added here without an explicit decorator would otherwise be
 * open platform-wide. Method-level `@Roles` (e.g. `setUserRole`'s SUPER_ADMIN
 * restriction) still takes precedence via `Reflector.getAllAndOverride`.
 */
@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminResolver {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  @Query(() => PaginatedUsersResponse)
  async adminUsers(
    @Args('filter', { nullable: true, defaultValue: {} })
    filter: AdminUsersFilterInput | null,
  ): Promise<PaginatedUsersResponse> {
    const { items, total, page, limit } = await this.adminService.getUsers(
      filter ?? {},
    );
    return {
      items: items.map((user) => this.usersService.toEntity(user)),
      total,
      page,
      limit,
    };
  }

  @Query(() => User)
  async adminUser(@Args('id', { type: () => ID }) id: string): Promise<User> {
    const user = await this.adminService.getUserById(id);
    return this.usersService.toEntity(user);
  }

  @Query(() => AdminStats)
  async adminStats(): Promise<AdminStats> {
    return this.adminService.getStats();
  }

  @Query(() => PaginatedAuditLogsResponse)
  async adminAuditLogs(
    @Args('filter', { nullable: true, defaultValue: {} })
    filter: AdminAuditLogFilterInput | null,
  ): Promise<PaginatedAuditLogsResponse> {
    const { items, total, page, limit } = await this.adminService.getAuditLogs(
      filter ?? {},
    );
    return {
      items: items.map((log) => ({
        ...log,
        metadata:
          log.metadata &&
          typeof log.metadata === 'object' &&
          !Array.isArray(log.metadata)
            ? (log.metadata as Record<string, unknown>)
            : null,
        actor: this.usersService.toEntity(log.actor),
        targetUser: this.usersService.toEntity(log.targetUser),
      })),
      total,
      page,
      limit,
    };
  }

  @Mutation(() => User)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deprovisionPro(
    @CurrentUser() admin: User,
    @Args('userId', { type: () => ID }) userId: string,
  ): Promise<User> {
    const user = await this.adminService.deprovisionPro(admin.id, userId);
    return this.usersService.toEntity(user);
  }

  @Mutation(() => User)
  @Roles(UserRole.SUPER_ADMIN)
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
