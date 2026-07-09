import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { AdminResolver } from './admin.resolver';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma/client';

/**
 * The admin surface's security contract lives entirely in the @Roles metadata
 * on each resolver method + RolesGuard. These tests assert the guard split so a
 * regression (e.g. opening setUserRole to ADMIN) fails loudly.
 */
describe('AdminResolver RBAC', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);
  const proto = AdminResolver.prototype;

  const ctxFor = (handler: unknown, role?: UserRole): ExecutionContext => {
    const args = [
      undefined,
      undefined,
      { req: { user: role ? { role } : undefined } },
      undefined,
    ];
    return {
      getHandler: () => handler,
      getClass: () => AdminResolver,
      getArgs: () => args,
      getArgByIndex: (i: number) => args[i],
      getType: () => 'graphql',
    } as unknown as ExecutionContext;
  };

  const roleGatedForBoth = [
    proto.adminUsers,
    proto.adminUser,
    proto.adminStats,
    proto.adminAuditLogs,
    proto.provisionPro,
    proto.deprovisionPro,
  ];

  it('opens read queries + provisioning to ADMIN and SUPER_ADMIN', () => {
    for (const method of roleGatedForBoth) {
      expect(reflector.get<UserRole[]>(ROLES_KEY, method)).toEqual([
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ]);
    }
  });

  it('restricts setUserRole to SUPER_ADMIN only', () => {
    expect(reflector.get<UserRole[]>(ROLES_KEY, proto.setUserRole)).toEqual([
      UserRole.SUPER_ADMIN,
    ]);
  });

  it('RolesGuard denies an ADMIN calling setUserRole', () => {
    expect(guard.canActivate(ctxFor(proto.setUserRole, UserRole.ADMIN))).toBe(
      false,
    );
  });

  it('RolesGuard allows an ADMIN to provision Pro', () => {
    expect(guard.canActivate(ctxFor(proto.provisionPro, UserRole.ADMIN))).toBe(
      true,
    );
  });

  it('RolesGuard allows a SUPER_ADMIN everywhere, including setUserRole', () => {
    expect(
      guard.canActivate(ctxFor(proto.setUserRole, UserRole.SUPER_ADMIN)),
    ).toBe(true);
    expect(
      guard.canActivate(ctxFor(proto.adminUsers, UserRole.SUPER_ADMIN)),
    ).toBe(true);
  });

  it('RolesGuard denies a plain USER on admin read queries', () => {
    expect(guard.canActivate(ctxFor(proto.adminUsers, UserRole.USER))).toBe(
      false,
    );
  });

  it('RolesGuard denies an unauthenticated request', () => {
    expect(guard.canActivate(ctxFor(proto.adminUsers, undefined))).toBe(false);
  });
});
