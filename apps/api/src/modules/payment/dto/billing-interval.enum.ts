import { registerEnumType } from '@nestjs/graphql';

export enum BillingInterval {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

registerEnumType(BillingInterval, {
  name: 'BillingInterval',
  description: 'Billing interval for subscriptions',
});
