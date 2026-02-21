# Wathīqah Monetization & Sustainability Strategy

## 1. Executive Summary
This document outlines the strategic plan to transition Wathīqah from a pure utility tool into a sustainable platform. The goal is to cover operational expenses (infrastructure, API services) and provide for continued development while maintaining high accessibility.

---

## 2. Structural Breakdown & Architecture

### A. Core Components
- **Subscription Engine (Backend)**: A new `SubscriptionModule` in NestJS to manage user tiers, billing cycles, and feature access.
- **Feature Gating System**: A `FeatureLimitInterceptor` combined with custom decorators (e.g., `@CheckFeature('allowSMS')`) to validate user permissions and automatically track usage.
- **Usage Tracker**: A DB-persisted counter for monthly feature consumption (e.g., SMS, Witness requests), integrated into the `User` model.
- **Payment Gateway Integration**: Webhook-driven synchronization with providers like Stripe or LemonSqueezy.

### B. Data Flow
1. **Request**: User attempts an action gated by `@CheckFeature('featureName')`.
2. **Intercept**: `FeatureLimitInterceptor` extracts the feature name from metadata.
3. **Validate**: Interceptor calls `SubscriptionService.checkFeatureLimit(userId, feature)`.
4. **Action**: If valid, the handler executes business logic.
5. **Update**: Upon successful execution, the interceptor automatically calls `SubscriptionService.incrementFeatureUsage(userId, feature)`.
6. **Error**: If limit reached, throws `ForbiddenException` with descriptive message.

---

## 3. Phased Implementation Roadmap

### Phase 1: Infrastructure & Gating (Current)
- **Milestone**: Backend support for tiers.
- **Deliverables**: Prisma schema updates, Subscription constants, Gating logic in `UsersService`.
- **Success Criteria**: Able to block a FREE user from adding more than 10 witnesses per month.

### Phase 2: User Experience & Tier Management (Completed)
- **Milestone**: UI awareness of subscription status.
- **Deliverables**: "Go Pro" landing page, Tier badges, usage progress bars in settings.
- **Success Criteria**: Users can see their current usage and limitations clearly.

## Phase 3: Payment & Automation (Implementation)

### Payment Provider Evaluation (2026 Update)

To support global growth while maintaining strong local performance in Nigeria, the following providers were evaluated:

| Provider | Type | Regional Strength | Tax/VAT Handling | Fees |
| :--- | :--- | :--- | :--- | :--- |
| **Stripe** | Gateway | Global (US/UK/EU) | No (Requires Stripe Tax) | 2.9% + $0.30 |
| **Flutterwave** | Gateway | Africa (Nigeria/Kenya) | No | 1.4% (NG), 3.8% (Intl) |
| **Paystack** | Gateway | Nigeria/Ghana | No | 1.5% + ₦100 (NG) |
| **Lemon Squeezy** | MoR | Global | **Yes** (Merchant of Record) | 5% + $0.50 |

**Selected Strategy**: **Hybrid Gateway Approach**
- **Stripe**: Primary for Global USD/EUR card payments.
- **Flutterwave**: Primary for Nigerian NGN payments (Bank Transfer, USSD, local cards).
- **Rationale**: This combination provides the best conversion rates by offering local payment methods in Nigeria while using the most trusted global processor for international users.

### Implementation Deliverables

- **Schema**: Add `Subscription`, `PaymentIntent`, and `WebhookLog` to Prisma.
- **Backend**:
  - `PaymentModule` with Stripe and Flutterwave services.
  - Webhook handlers for asynchronous payment confirmation.
  - Subscription lifecycle management (trial, active, past_due, canceled).
- **Frontend**:
  - Unified Checkout UI using Stripe Elements and Flutterwave Inline.
  - Billing management portal.

### Phase 4: Support System & Community
- **Milestone**: Voluntary funding enabled.
- **Deliverables**: Support widget, Supporter badges, Transparency dashboard.

---

## 4. Support System: Deep Dive

### A. Feasibility & Technical Requirements
- **Providers**: 
    - **Global**: Stripe (Checkout), BuyMeACoffee API.
    - **Local (NGN)**: Paystack or Flutterwave.
- **Integration**: Requires a `SupportModule` to handle one-time payment intents and success callbacks.

### B. Security & Compliance (PCI DSS)
- **Zero-Storage Policy**: Wathīqah will **never** store credit card numbers. All sensitive data stays within the payment provider's (Stripe/Paystack) secure environment.
- **Tokenization**: Use provider-hosted fields or checkout pages to minimize PCI scope to SAQ-A (the simplest level).

### C. Legal & Tax Considerations
- **Categorization**: Contributions for non-charity apps are usually treated as "Tips" or "Gifts" and are taxable income.
- **VAT/GST**: Digital services taxes may apply depending on the user's region. LemonSqueezy handles this automatically (Merchant of Record), making it highly recommended.

### D. Administrative Requirements
- **Payouts**: Automatic or manual transfers from the provider to your bank account.
- **Transparency**: A simple admin dashboard to track total support vs. server costs.

---

## 5. GraphQL API Specifications

### `Subscription`
- **Query** `me`: Returns current `User` with their `tier`, `limits`, and `featureUsage`.
- **Mutation** `createSupportSession`: Returns a checkout URL/session for upgrading.
- **Webhook (REST)** `/subscription/webhook`: *Note: Webhooks remain REST-based as they are called by external providers.*

### `Support`
- **Query** `supportOptions`: Returns available support amounts and methods.
- **Mutation** `createSupportSession`: Returns a checkout URL/session for a support payment.
- **Webhook**: Handles asynchronous payment confirmation and updates user's `isSupporter` status.
- **Badge System**: Triggers "Supporter" badge on user profile upon first successful support payment.

## 5. Integration Roadmap

### Phase 1: Subscription Core (Current)
- **Status**: Implementation in progress.
- **Focus**: Flutterwave integration, Tier logic, Pro features gatekeeping.

### Phase 2: Webhooks & Automation
- **Focus**: Handling payment success/failure, auto-downgrading, notification emails.

### Phase 3: Contribution System
- **Focus**: Voluntary support flow, Supporter badges.

### Phase 4: Analytics & Insights
- **Focus**: Advanced financial reporting for Pro users.

## 6. Technical Deliverables

- **`SubscriptionModule`**: Backend logic for tier management.
- **`SupportModule`**: Backend logic for voluntary funding.
- **`BillingDashboard`**: Frontend view for managing plans.
- **`SupportWidget`**: Frontend component for support payments.
- **`featureUsage`**: Dynamic JSON field in User model for tracking limits.

---

**Note**: All financial terminology follows the core philosophy of Wathīqah, prioritizing clarity and transparency in all user interactions.
