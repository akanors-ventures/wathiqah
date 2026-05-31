import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { OrgRole } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export const ORG_ROLES_KEY = 'orgRoles';
export const OrgRoles = (...roles: OrgRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);

@Injectable()
export class OrgRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user as {
      id: string;
      activeOrgId?: string | null;
    };

    if (!user?.activeOrgId) return false;

    const member = await this.prisma.organisationMember.findUnique({
      where: { orgId_userId: { orgId: user.activeOrgId, userId: user.id } },
      select: { role: true },
    });

    if (!member) return false;
    return requiredRoles.includes(member.role);
  }
}
