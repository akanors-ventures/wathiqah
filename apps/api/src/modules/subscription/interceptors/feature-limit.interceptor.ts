import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SubscriptionService } from '../subscription.service';
import { CHECK_FEATURE_KEY } from '../decorators/check-feature.decorator';
import { TierLimits } from '../subscription.constants';

@Injectable()
export class FeatureLimitInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const feature = this.reflector.get<keyof TierLimits>(
      CHECK_FEATURE_KEY,
      context.getHandler(),
    );

    if (!feature) {
      return next.handle();
    }

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req?.user;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // 1. Check limit before execution
    const required = this.calculateRequiredCount(context, feature);

    if (required === 0) {
      return next.handle();
    }

    await this.subscriptionService.checkFeatureLimit(
      user.id,
      feature,
      required,
    );

    // 2. Execute and increment usage on success
    return next.handle().pipe(
      tap(async () => {
        try {
          await this.subscriptionService.incrementFeatureUsage(
            user.id,
            feature,
            required,
          );
        } catch (error) {
          // Log error but don't fail the request since the action already succeeded
          console.error(
            `Failed to increment feature usage for user ${user.id}, feature ${feature}:`,
            error,
          );
        }
      }),
    );
  }

  private calculateRequiredCount(
    context: ExecutionContext,
    feature: keyof TierLimits,
  ): number {
    if (feature !== 'maxWitnessesPerMonth') {
      return 1;
    }

    const ctx = GqlExecutionContext.create(context);
    const args = ctx.getArgs();
    const input =
      args.input || args.addWitnessInput || args.createTransactionInput;

    if (!input) {
      return 1;
    }

    const witnessUserIdsCount = (input.witnessUserIds || []).length;
    const witnessInvitesCount = (input.witnessInvites || []).length;

    return witnessUserIdsCount + witnessInvitesCount;
  }
}
