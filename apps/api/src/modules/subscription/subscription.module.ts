import { Module, Global } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionResolver } from './subscription.resolver';
import { FeatureLimitInterceptor } from './interceptors/feature-limit.interceptor';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [UsersModule],
  providers: [
    SubscriptionService,
    SubscriptionResolver,
    FeatureLimitInterceptor,
  ],
  exports: [SubscriptionService, FeatureLimitInterceptor],
})
export class SubscriptionModule {}
