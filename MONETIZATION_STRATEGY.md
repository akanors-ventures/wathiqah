# Wathȋqah Monetization & Sustainability Strategy

## 1. Executive Summary
This document outlines the strategic plan to transition Wathȋqah from a pure utility tool into a sustainable platform. The goal is to cover operational expenses (infrastructure, API services) and provide for continued development while maintaining high accessibility.

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

### Phase 3: Payment & Automation
- **Milestone**: Automated billing.
- **Deliverables**: Stripe/LemonSqueezy integration, Webhook handlers, Automated tier upgrades.
- **Success Criteria**: Seamless transition from FREE to PRO upon payment.

### Phase 4: Donation System & Community Support
- **Milestone**: Voluntary funding enabled.
- **Deliverables**: Donation widget, Supporter badges, Transparency dashboard.

---

## 4. Donation System: Deep Dive

### A. Feasibility & Technical Requirements
- **Providers**: 
    - **Global**: Stripe (Checkout), BuyMeACoffee API.
    - **Local (NGN)**: Paystack or Flutterwave.
- **Integration**: Requires a `DonationModule` to handle one-time payment intents and success callbacks.

### B. Security & Compliance (PCI DSS)
- **Zero-Storage Policy**: Wathȋqah will **never** store credit card numbers. All sensitive data stays within the payment provider's (Stripe/Paystack) secure environment.
- **Tokenization**: Use provider-hosted fields or checkout pages to minimize PCI scope to SAQ-A (the simplest level).

### C. Legal & Tax Considerations
- **Categorization**: Donations for non-charity apps are usually treated as "Tips" or "Gifts" and are taxable income.
- **VAT/GST**: Digital services taxes may apply depending on the user's region. LemonSqueezy handles this automatically (Merchant of Record), making it highly recommended.

### D. Administrative Requirements
- **Payouts**: Automatic or manual transfers from the provider to your bank account.
- **Transparency**: A simple admin dashboard to track total donations vs. server costs.

---

## 5. GraphQL API Specifications

### `Subscription`
- **Query** `me`: Returns current `User` with their `tier`, `limits`, and `featureUsage`.
- **Mutation** `createSubscriptionSession`: Returns a checkout URL/session for upgrading.
- **Webhook (REST)** `/subscription/webhook`: *Note: Webhooks remain REST-based as they are called by external providers.*

### `Donation`
- **Query** `donationOptions`: Returns available donation amounts and methods.
- **Mutation** `createDonationSession`: Returns a checkout URL/session for a donation.

---

## 6. Integration Analysis
The monetization system will integrate with the existing architecture as a **Cross-Cutting Concern**.
- **User Module**: Extended to store tier data.
- **Notification Module**: Gated to restrict SMS to PRO users.
- **Witness Module**: GraphQL resolvers gated to enforce monthly limits.
- **Frontend**: New views consuming `mySubscription` query and `createDonationSession` mutations.

**Development Effort**: Estimated at 40-60 engineering hours for full automation (Phase 1-3).
