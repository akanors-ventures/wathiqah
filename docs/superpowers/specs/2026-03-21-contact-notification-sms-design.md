# Contact Notification (SMS + Email) — Design Spec

**Project:** Wathīqah
**Phase:** 1 of 6 (Development Recommendations Cycle)
**Date:** 2026-03-21
**Status:** Approved — ready for implementation

---

## Overview

When a transaction is recorded against a contact's phone number, the contact receives an SMS notifying them that a record exists in their name — regardless of whether they are a Wathīqah member. This is the highest-impact feature on the roadmap: it transforms Wathīqah from a one-sided documentation tool into a bilateral trust system and creates a direct organic acquisition channel.

---

## Scope

### In scope
- SMS notification to contact on qualifying transaction creation (if contact has a phone number)
- Email notification to contact on qualifying transaction creation (if contact has an email address)
- Opt-out tracking via `SmsOptOut` table (SMS only; email opt-out is out of scope for this phase)
- Twilio STOP reply webhook to persist SMS opt-outs
- Free-tier SMS limit (10/month per creator) with in-app feedback when limit is hit
- Pro tier: unlimited contact notification SMS; email notifications unlimited for all tiers

### Out of scope
- Contact notification on transaction update or deletion
- Email opt-out tracking
- Admin UI for opt-out management
- USSD / SMS-only access

---

## Qualifying Transaction Types

Contact notification SMS fires only when the transaction type directly involves the contact as a financial party. The actual `TransactionType` enum has six values: `GIVEN`, `RECEIVED`, `RETURNED`, `GIFT`, `EXPENSE`, `INCOME`. `RETURNED` covers both return directions (disambiguated by `ReturnDirection`). `GIFT` is excluded.

| Type | Fires? | Notes |
|------|--------|-------|
| `GIVEN` | ✅ | |
| `RECEIVED` | ✅ | |
| `RETURNED` | ✅ | Both `TO_ME` and `TO_CONTACT` directions involve the contact |
| `GIFT` | ❌ | Excluded |
| `INCOME` | ❌ | No contact party |
| `EXPENSE` | ❌ | No contact party |

Additional precondition: the contact must have a phone number on record.

---

## Architecture

### Approach: BullMQ jobs (async, non-blocking)

After a qualifying transaction is saved, `TransactionsService` checks the creator's free-tier SMS limit **synchronously** before enqueuing. If the limit is hit, `smsSkipped: true` is set on the return value immediately (not by the async job). If clear, the SMS job is enqueued. Separately, if the contact has an email address, an email notification job is also enqueued — email is not gated by tier or a monthly limit. Both jobs run asynchronously through the existing BullMQ `notifications` queue. This matches the pattern already used for witness invite notifications.

---

## Data Layer

### New model: `SmsOptOut`

```prisma
model SmsOptOut {
  id          String       @id @default(cuid())
  phoneNumber String       @unique
  source      OptOutSource
  createdAt   DateTime     @default(now())
}

enum OptOutSource {
  REPLY_STOP
  MANUAL
}
```

Keyed on phone number (not userId) so opt-outs work for non-members and members alike.

### Subscription constants update

In `subscription.constants.ts`, add `contactNotificationSms: number` to the `TierLimits` interface and to both tier limit objects:

```typescript
// In TierLimits interface:
contactNotificationSms: number;

// FREE tier:
contactNotificationSms: 10,

// PRO tier:
contactNotificationSms: -1, // unlimited
```

The existing `featureUsage` JSON field on `User`, `incrementFeatureUsage()`, and `checkFeatureLimit()` handle the monthly counting — this adds a new numeric key to the existing system with no structural changes beyond the interface update.

---

## Backend Logic

### `SmsOptOutService` (new, inside `notifications` module)

| Method | Signature | Description |
|--------|-----------|-------------|
| `isOptedOut` | `(phoneNumber: string): Promise<boolean>` | Returns true if phone number is in `SmsOptOut` table |
| `addOptOut` | `(phoneNumber: string, source: OptOutSource): Promise<void>` | Persists opt-out record |

### BullMQ job: `send-contact-notification-sms`

**Job payload type** (add `ContactNotificationSmsJobData` to `NotificationJobData` union in `job-data.interface.ts`):

```typescript
export interface ContactNotificationSmsJobData {
  type: 'send-contact-notification-sms';
  transactionId: string;
  contactPhoneNumber: string;
  contactFirstName: string | null;
  creatorId: string;
  creatorDisplayName: string;
  amount: number;        // converted from Prisma Decimal via .toNumber() at enqueue time
  currency: string;
}
```

**Job processor flow** (limit check has already passed before enqueue):
1. Check `SmsOptOut.isOptedOut(contactPhoneNumber)` — if opted out, skip silently and exit
2. Build SMS body from template
3. Send via `TwilioSmsProvider.sendSms()`
4. On success: call `subscriptionService.incrementFeatureUsage(creatorId, 'contactNotificationSms')`

**Processor constructor:** Inject `SubscriptionService` directly into `NotificationsProcessor`'s constructor. Because `SubscriptionModule` is decorated `@Global()`, no additional import is required in `NotificationsModule`.

**SMS body template:**
```
[firstName or "Someone"], a transaction of [amount] [currency] has been
recorded in your name by [creatorDisplayName] on Wathīqah.
View your record at wathiqah.akanors.com. Reply STOP to opt out.
```

Note: Use the `currency` code from the job payload (e.g. `NGN`, `USD`) rather than a hardcoded symbol to ensure correctness for all currencies. Witness name is omitted since witnesses may not yet be assigned at transaction creation time.

### Email notification to contact

When a contact has an email address, enqueue a separate `send-contact-notification-email` job alongside (or instead of, if no phone number) the SMS job. Email is not gated by tier — all users can send contact notification emails without limit.

**Email job payload:**
```typescript
export interface ContactNotificationEmailJobData {
  type: 'send-contact-notification-email';
  transactionId: string;
  contactEmail: string;
  contactFirstName: string | null;
  creatorDisplayName: string;
  amount: number;        // Prisma Decimal converted via .toNumber()
  currency: string;
}
```

**Email content:** Use the existing template service (`TemplateService`) consistent with the witness invite email pattern. Subject: `"A transaction has been recorded in your name on Wathīqah"`. Body should mirror the SMS message with a link to `wathiqah.akanors.com`.

A contact may have both a phone number and an email — in that case **both** jobs are enqueued and both notifications are sent.

### Twilio opt-out webhook

New POST endpoint in `NotificationsController`:

```
POST /notifications/sms/optout
```

**Auth:** No auth decorator is needed. HTTP controllers in this project are unauthenticated by default — authentication is enforced only at the GraphQL resolver layer via `@UseGuards(GqlAuthGuard)`. The new controller requires no guard annotations.

**Protection:** Validate the `X-Twilio-Signature` header using `twilio.validateRequest()` from the `twilio` npm package (already a project dependency) directly in the handler body. The validation requires `TWILIO_AUTH_TOKEN` (already in env), the full request URL, and the POST body parameters. Reject requests that fail signature validation with a 403 before calling `addOptOut`.

**Flow:**
- Extract `From` (sender phone number in E.164 format) from Twilio webhook payload
- Call `smsOptOutService.addOptOut(phoneNumber, OptOutSource.REPLY_STOP)`
- Return 200 with empty TwiML response (`<Response></Response>`)

Twilio also handles STOP at the carrier level automatically. This endpoint keeps the Wathīqah DB in sync to avoid unnecessary API calls to opted-out numbers.

---

## Transaction Service Integration

In `TransactionsService.createTransaction()`, after the transaction is saved, perform a **synchronous** SMS limit check then enqueue applicable jobs:

```typescript
const qualifyingTypes = [
  TransactionType.GIVEN,
  TransactionType.RECEIVED,
  TransactionType.RETURNED,
];

let smsSkipped = false;

if (qualifyingTypes.includes(transaction.type)) {
  const amountAsNumber = transaction.amount?.toNumber() ?? 0; // Decimal? → number
  const payload = {
    transactionId: transaction.id,
    contactFirstName: contact?.firstName ?? null,
    creatorDisplayName: creator.firstName ?? creator.email,
    amount: amountAsNumber,
    currency: transaction.currency,
  };

  // SMS — gated by tier limit
  if (contact?.phoneNumber) {
    const canSend = await this.subscriptionService.canUseFeature(
      creator.id,
      'contactNotificationSms',
    );
    if (!canSend) {
      smsSkipped = true;
    } else {
      await this.notificationsQueue.add('send-contact-notification-sms', {
        type: 'send-contact-notification-sms',
        ...payload,
        contactPhoneNumber: contact.phoneNumber,
        creatorId: creator.id,
      });
    }
  }

  // Email — no tier gate, unlimited for all users
  if (contact?.email) {
    await this.notificationsQueue.add('send-contact-notification-email', {
      type: 'send-contact-notification-email',
      ...payload,
      contactEmail: contact.email,
    });
  }
}

return { ...transaction, smsSkipped };
```

The `smsSkipped` field is a **transient field on the GraphQL response type only** — no database column or schema migration required. Add it to the transaction GraphQL entity as `@Field(() => Boolean, { nullable: true })`.

---

## Frontend Feedback (Limit Hit)

The transaction creation mutation response includes `smsSkipped: Boolean`. When `smsSkipped` is `true`, the frontend displays a dismissible toast:

> "Transaction saved. SMS not sent — you've reached your 10 free contact notifications this month. **Upgrade to Pro**"

"Upgrade to Pro" links directly to the pricing/upgrade flow.

---

## Tier Access Summary

| Feature | Free | Pro |
|---------|------|-----|
| Contact notification SMS | 10/month | Unlimited |
| Contact notification email | Unlimited | Unlimited |
| Opt-out compliance (SMS) | ✅ | ✅ |
| In-app notice when SMS limit hit | ✅ | N/A |

---

## Files to Create / Modify

### Create
- `apps/api/src/modules/notifications/services/sms-optout.service.ts`
- `apps/api/src/modules/notifications/notifications.controller.ts` — new controller; also add `controllers: [NotificationsController]` to `notifications.module.ts`
- `apps/api/prisma/migrations/` — new migration for `SmsOptOut` model and `OptOutSource` enum
- Email template for contact notification (consistent with existing witness invite template structure)

### Modify
- `apps/api/prisma/schema.prisma` — add `SmsOptOut` model and `OptOutSource` enum
- `apps/api/src/modules/notifications/interfaces/job-data.interface.ts` — add `ContactNotificationSmsJobData` and `ContactNotificationEmailJobData` interfaces; include both in `NotificationJobData` union
- `apps/api/src/modules/notifications/notifications.module.ts` — register `SmsOptOutService`; add `NotificationsController` to `controllers` array
- `apps/api/src/modules/notifications/notifications.processor.ts` — add `send-contact-notification-sms` and `send-contact-notification-email` job handlers
- `apps/api/src/modules/subscription/subscription.constants.ts` — add `contactNotificationSms: number` to `TierLimits` interface and both tier objects
- `apps/api/src/modules/transactions/transactions.service.ts` — synchronous SMS limit check and conditional job enqueue (SMS + email) after qualifying transaction creation
- `apps/api/src/modules/transactions/entities/transaction.entity.ts` — add `smsSkipped` as nullable transient `@Field(() => Boolean, { nullable: true })` (no DB column)
- `apps/web/src/` — add toast notification on `smsSkipped: true` in transaction creation mutation response

---

## Dependencies

- Twilio account with SMS-capable number (already configured)
- `TWILIO_AUTH_TOKEN` env var for webhook signature validation (already in env)
- `twilio` npm package for `validateRequest()` (already a project dependency)
- Existing `featureUsage` / `canUseFeature` / `incrementFeatureUsage` pattern in `SubscriptionService`
- Existing BullMQ `notifications` queue

---

*Spec prepared by Claude (Anthropic) in consultation with Abdganiyu Fawaz Opeyemi, Director, Akanors Ventures Ltd.*
*For internal use only — Akanors Ventures Ltd. (RC 9035454)*
