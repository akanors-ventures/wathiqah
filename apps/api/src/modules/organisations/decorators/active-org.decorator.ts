import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Extracts the active org ID from the JWT-decorated request user.
 * Returns null when the user is in personal (non-org) mode.
 */
export const ActiveOrg = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | null => {
    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user as { activeOrgId?: string | null };
    return user?.activeOrgId ?? null;
  },
);
