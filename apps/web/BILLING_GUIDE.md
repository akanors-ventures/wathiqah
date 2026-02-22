# Billing & Subscription System Guide

## Overview

The Wathīqah billing system supports multi-currency subscriptions (NGN, USD, EUR, etc.) via multiple payment providers:
- **Stripe**: Global payments (USD, EUR, GBP, etc.)
- **Flutterwave**: Nigerian payments (NGN)
- **LemonSqueezy**: Alternative global provider

## Frontend Implementation

### Settings Page (`/settings`)

The `BillingSection` component in `apps/web/src/routes/settings.tsx` manages the user's subscription status.

#### Key Features:
- **Plan Display**: Shows current tier (Free/Pro) and status (Active/Cancelling).
- **Usage Stats**: Visualizes witness request usage against plan limits.
- **Cancellation**: Allows users to cancel auto-renewal via a confirmation dialog.
- **Auto-Renewal Status**: Displays end date and renewal status.

#### Hooks:
- `useSubscription`: Fetches current subscription details, usage, and limits.
- `useMutation(CANCEL_SUBSCRIPTION)`: Handles the cancellation request.

### Cancellation Flow

1.  User clicks "Cancel Subscription".
2.  `AlertDialog` prompts for confirmation.
3.  Upon confirmation, `CANCEL_SUBSCRIPTION` mutation is called.
4.  Backend updates the subscription to `cancel_at_period_end`.
5.  UI updates to show "Cancelling" status and access end date.

## Backend Implementation

### Payment Service

Located in `apps/api/src/modules/payment/payment.service.ts`.

- **`createSubscriptionSession`**: Initiates checkout flow based on currency/provider.
- **`cancelSubscription`**: Routes cancellation request to the appropriate provider service.
- **`handleWebhook`**: Processes events (payment success, subscription updates) to keep local DB in sync.

### Provider Services

- **Stripe**: Sets `cancel_at_period_end: true` on the subscription.
- **Flutterwave**: Updates local status (as Flutterwave doesn't support "cancel at period end" natively in the same way, or it's handled via direct API).
- **LemonSqueezy**: Cancels via API.

## Testing

Tests are located in `apps/web/src/routes/settings.test.tsx`.

### Coverage:
- Rendering of plan details (Free/Pro).
- Cancellation dialog interaction.
- Auto-renewal status display.
- Loading states.

## Future Improvements

- **Billing Portal**: Add a link to the provider's customer portal for updating payment methods.
- **Invoice History**: Display a list of past invoices.
