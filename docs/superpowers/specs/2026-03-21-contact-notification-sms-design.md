# Contact Notification SMS — Design Spec

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
- SMS notification to contact on qualifying transaction creation
- Opt-out tracking via `SmsOptOut` table
- Twilio STOP reply webhook to persist opt-outs
- Free-tier limit (10/month per creator) with in-app feedback when limit is hit
- Pro tier: unlimited contact notification SMS

### Out of scope
- Contact notification on transaction update or deletion
- Email fallback for contact notification
- Admin UI for opt-out management
- USSD / SMS-only access

---

## Qualifying Transaction Types

Contact notification SMS fires only when the transaction type directly involves the contact as a financial party:

| Type | Fires? |
|------|--------|
| `GIVEN` | ✅ |
| `RECEIVED` | ✅ |
| `RETURNED_TO_ME` | ✅ |
| `RETURNED_TO_CONTACT` | ✅ |
| `GIFT_GIVEN` | ❌ |
| `GIFT_RECEIVED` | ❌ |
| `INCOME` | ❌ |
| `EXPENSE` | ❌ |

Additional precondition: the contact must have a phone number on record.

---

## Architecture

### Approach: BullMQ job (async, non-blocking)

After a qualifying transaction is saved, `TransactionsService` enqueues a `send-contact-notification-sms` job. The existing BullMQ job processor in the `notifications` module picks it up asynchronously. This matches the pattern already used for witness invite SMS and keeps transaction creation fast regardless of SMS outcome. Retries (3 attempts, 5s delay) are inherited from the existing queue configuration.

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

In `subscription.constants.ts`, add `contactNotificationSms` to the feature limits map:

| Tier | Limit |
|------|-------|
| `FREE` | `10` per month |
| `PRO` | `-1` (unlimited) |

The existing `featureUsage` JSON field on `User`, `incrementFeatureUsage()`, and `checkFeatureLimit()` handle the monthly counting — this adds a new key to the existing system with no structural changes.

---

## Backend Logic

### `SmsOptOutService` (new, inside `notifications` module)

| Method | Signature | Description |
|--------|-----------|-------------|
| `isOptedOut` | `(phoneNumber: string): Promise<boolean>` | Returns true if phone number is in `SmsOptOut` table |
| `addOptOut` | `(phoneNumber: string, source: OptOutSource): Promise<void>` | Persists opt-out record |

### BullMQ job: `send-contact-notification-sms`

**Job payload:**
```typescript
{
  transactionId: string;
  contactPhoneNumber: string;
  contactFirstName: string | null;
  creatorId: string;
  creatorDisplayName: string;
  amount: number;
  currency: string;
}
```

**Job processor flow:**
1. Check `SmsOptOut` — if opted out, skip silently and exit
2. Call `checkFeatureLimit(creatorId, 'contactNotificationSms')` — if limit hit, set `smsSkipped: true` on transaction record and exit
3. Build SMS body from template
4. Send via `TwilioSmsProvider.sendSms()`
5. On success: call `incrementFeatureUsage(creatorId, 'contactNotificationSms')`

**SMS body template:**
```
[firstName or "Someone"], a transaction of ₦[amount] has been
recorded in your name by [creatorDisplayName] on Wathīqah.
View your record at wathiqah.akanors.com. Reply STOP to opt out.
```

Note: Witness name is omitted from this notification since witnesses may not yet be assigned at transaction creation time.

### Twilio opt-out webhook

New POST endpoint in `NotificationsController`:

```
POST /notifications/sms/optout
```

- Validates Twilio request signature
- Extracts `From` (phone number) from Twilio webhook payload
- Calls `smsOptOutService.addOptOut(phoneNumber, OptOutSource.REPLY_STOP)`
- Returns 200 with empty TwiML response

Twilio also handles STOP at the carrier level automatically. This endpoint keeps the Wathīqah DB in sync to avoid unnecessary API calls to opted-out numbers.

---

## Transaction Service Integration

In `TransactionsService.createTransaction()`, after the transaction is saved:

```typescript
const qualifyingTypes = [
  TransactionType.GIVEN,
  TransactionType.RECEIVED,
  TransactionType.RETURNED_TO_ME,
  TransactionType.RETURNED_TO_CONTACT,
];

if (
  qualifyingTypes.includes(transaction.type) &&
  contact?.phoneNumber
) {
  await this.notificationsQueue.add('send-contact-notification-sms', {
    transactionId: transaction.id,
    contactPhoneNumber: contact.phoneNumber,
    contactFirstName: contact.firstName ?? null,
    creatorId: creator.id,
    creatorDisplayName: creator.firstName ?? creator.email,
    amount: transaction.amount,
    currency: transaction.currency,
  });
}
```

The enqueue happens **after** the transaction is returned — SMS failure never blocks or rolls back the transaction.

---

## Frontend Feedback (Limit Hit)

When the job processor detects the free-tier limit is hit, it sets `smsSkipped: true` on the transaction record. The frontend checks this field in the transaction creation mutation response and displays a dismissible toast:

> "Transaction saved. SMS not sent — you've reached your 10 free contact notifications this month. **Upgrade to Pro**"

"Upgrade to Pro" links directly to the pricing/upgrade flow.

---

## Tier Access Summary

| Feature | Free | Pro |
|---------|------|-----|
| Contact notification SMS | 10/month | Unlimited |
| Opt-out compliance | ✅ | ✅ |
| In-app notice when limit hit | ✅ | N/A |

---

## Files to Create / Modify

### Create
- `apps/api/src/modules/notifications/services/sms-optout.service.ts`
- `apps/api/prisma/migrations/` — new migration for `SmsOptOut` model and `OptOutSource` enum

### Modify
- `apps/api/prisma/schema.prisma` — add `SmsOptOut` model and `OptOutSource` enum
- `apps/api/src/modules/notifications/notifications.module.ts` — register `SmsOptOutService`
- `apps/api/src/modules/notifications/notification.service.ts` — add job enqueue helper if needed
- `apps/api/src/modules/notifications/processors/notification.processor.ts` — add `send-contact-notification-sms` job handler
- `apps/api/src/modules/notifications/notifications.controller.ts` — add `/sms/optout` endpoint
- `apps/api/src/modules/subscription/subscription.constants.ts` — add `contactNotificationSms` feature key
- `apps/api/src/modules/transactions/transactions.service.ts` — enqueue job after qualifying transaction creation
- `apps/api/src/modules/transactions/dto/` — add `smsSkipped` field to transaction response if needed
- `apps/web/src/` — add toast notification on `smsSkipped: true` in transaction creation response

---

## Dependencies

- Twilio account with SMS-capable number (already configured)
- `TWILIO_AUTH_TOKEN` env var for webhook signature validation (should already exist)
- Existing `featureUsage` / `checkFeatureLimit` / `incrementFeatureUsage` pattern in `SubscriptionService`
- Existing BullMQ `notifications` queue

---

*Spec prepared by Claude (Anthropic) in consultation with Abdganiyu Fawaz Opeyemi, Director, Akanors Ventures Ltd.*
*For internal use only — Akanors Ventures Ltd. (RC 9035454)*
