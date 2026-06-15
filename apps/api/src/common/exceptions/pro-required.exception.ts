import { GraphQLError } from 'graphql';

export class ProRequiredException extends GraphQLError {
  constructor(message = 'You need a Pro subscription to access this feature.') {
    super(message, { extensions: { code: 'PRO_REQUIRED' } });
  }
}
