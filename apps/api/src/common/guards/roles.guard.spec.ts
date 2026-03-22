import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '../../generated/prisma/client';

const mockReflector = { getAllAndOverride: jest.fn() };

const makeContext = (role: UserRole | undefined) => {
  const mockGqlCtx = {
    getContext: () => ({ req: { user: role ? { role } : undefined } }),
  };
  jest
    .spyOn(GqlExecutionContext, 'create')
    .mockReturnValue(mockGqlCtx as unknown as GqlExecutionContext);
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(mockReflector as unknown as Reflector);
    jest.clearAllMocks();
  });

  it('allows access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows access when user has required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(makeContext(UserRole.ADMIN))).toBe(true);
  });

  it('denies access when user lacks required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(makeContext(UserRole.USER))).toBe(false);
  });

  it('denies access when user is undefined', () => {
    mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });
});
