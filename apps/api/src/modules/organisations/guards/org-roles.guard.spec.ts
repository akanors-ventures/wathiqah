import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { OrgRolesGuard, ORG_ROLES_KEY } from './org-roles.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { OrgRole } from '../../../generated/prisma/client';

jest.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: jest.fn(),
  },
}));

describe('OrgRolesGuard', () => {
  let guard: OrgRolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { organisationMember: { findUnique: jest.Mock } };

  beforeEach(async () => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = { organisationMember: { findUnique: jest.fn() } };

    const module = await Test.createTestingModule({
      providers: [
        OrgRolesGuard,
        { provide: Reflector, useValue: reflector },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get(OrgRolesGuard);
  });

  function makeContext(user: object) {
    const mockCtx = { getContext: () => ({ req: { user } }) };
    (GqlExecutionContext.create as jest.Mock).mockReturnValue(mockCtx);
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  }

  it('exports the correct metadata key', () => {
    expect(ORG_ROLES_KEY).toBe('orgRoles');
  });

  it('allows through when no roles required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeContext({ id: 'u1', activeOrgId: 'org1' });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('denies when user has no activeOrgId', async () => {
    reflector.getAllAndOverride.mockReturnValue([OrgRole.ADMIN]);
    const ctx = makeContext({ id: 'u1', activeOrgId: null });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it('denies when user is not a member of the active org', async () => {
    reflector.getAllAndOverride.mockReturnValue([OrgRole.ADMIN]);
    prisma.organisationMember.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ id: 'u1', activeOrgId: 'org1' });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it('denies when member role does not satisfy required roles', async () => {
    reflector.getAllAndOverride.mockReturnValue([OrgRole.ADMIN]);
    prisma.organisationMember.findUnique.mockResolvedValue({
      role: OrgRole.OPERATOR,
    });
    const ctx = makeContext({ id: 'u1', activeOrgId: 'org1' });
    expect(await guard.canActivate(ctx)).toBe(false);
  });

  it('allows when member role satisfies required roles', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      OrgRole.ADMIN,
      OrgRole.OPERATOR,
    ]);
    prisma.organisationMember.findUnique.mockResolvedValue({
      role: OrgRole.OPERATOR,
    });
    const ctx = makeContext({ id: 'u1', activeOrgId: 'org1' });
    expect(await guard.canActivate(ctx)).toBe(true);
  });
});
