import { Global, Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

export const PUB_SUB = Symbol('PUB_SUB');

/**
 * In-memory PubSub for GraphQL subscriptions. Fine for a single API instance;
 * if the API ever scales to multiple instances, swap the provider factory for
 * a Redis-backed PubSubEngine (e.g. graphql-redis-subscriptions) so published
 * events reach subscribers connected to a different instance.
 */
@Global()
@Module({
  providers: [{ provide: PUB_SUB, useValue: new PubSub() }],
  exports: [PUB_SUB],
})
export class PubSubModule {}
