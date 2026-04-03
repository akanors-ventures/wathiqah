# Contact Notification Trigger Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move contact notification (SMS + email) from transaction creation to first witness acknowledgment, and enrich both messages with transaction type and witness name.

**Architecture:** Eight tasks touching the notifications interface, notification service, processor, email templates, witness service, transaction service, transaction entity, and frontend. Tasks are ordered so the codebase compiles at every commit. TDD: failing tests written first in Task 1, made green in Task 6.

**Tech Stack:** NestJS, Prisma, BullMQ, Handlebars email templates, React 19, Apollo Client, Vitest

---

## File Map

| Action | File                                                                                           | Change                                                                             |
| ------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Modify | `apps/api/src/modules/notifications/interfaces/job-data.interface.ts`                          | Add `witnessDisplayName` + `transactionType` to SMS and email job data             |
| Modify | `apps/api/src/modules/notifications/notification.service.ts`                                   | Add `witnessDisplayName` + `transactionType` to `sendContactNotification()` params |
| Modify | `apps/api/src/modules/notifications/notifications.processor.ts`                                | Update SMS body + email handler to use new fields                                  |
| Modify | `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.html.hbs` | Add `witnessDisplayName` + `typeLabel` variables                                   |
| Modify | `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.txt.hbs`  | Same                                                                               |
| Modify | `apps/api/src/modules/witnesses/witnesses.service.ts`                                          | Fire contact notification on first acknowledgment                                  |
| Modify | `apps/api/src/modules/witnesses/witnesses.service.spec.ts`                                     | Add `acknowledge()` tests                                                          |
| Modify | `apps/api/src/modules/transactions/transactions.service.ts`                                    | Remove `sendContactNotification` call + `smsSkipped`                               |
| Modify | `apps/api/src/modules/transactions/entities/transaction.entity.ts`                             | Remove `smsSkipped` transient field                                                |
| Modify | `apps/web/src/lib/apollo/queries/transactions.ts`                                              | Remove `smsSkipped` from mutation fragment                                         |
| Modify | `apps/web/src/routes/transactions/new.tsx`                                                     | Remove `smsSkipped` toast branch                                                   |
| Modify | `apps/web/src/routes/items/new.tsx`                                                            | Remove `smsSkipped` toast branch                                                   |

---

## Task 1: Write failing tests for `acknowledge()`

**Files:**

- Modify: `apps/api/src/modules/witnesses/witnesses.service.spec.ts`

- [ ] **Step 1.1: Replace the spec file with the full content below**

The existing spec only tests `findMyRequests`. Replace the entire file to keep the existing pagination tests and add a new `describe` block for `acknowledge()`:

```typescript
import { Test } from "@nestjs/testing";
import { WitnessesService } from "./witnesses.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { NotificationService } from "../notifications/notification.service";
import { ConfigService } from "@nestjs/config";
import { WitnessStatus, TransactionType } from "../../generated/prisma/client";

// ---------------------------------------------------------------------------
// Shared factory helpers
// ---------------------------------------------------------------------------

function makeWitness(overrides: Record<string, unknown> = {}) {
  return {
    id: "witness-1",
    transactionId: "tx-1",
    status: WitnessStatus.PENDING,
    userId: "user-1",
    ...overrides,
  };
}

function makeUpdatedWitness(overrides: Record<string, unknown> = {}) {
  return {
    id: "witness-1",
    transactionId: "tx-1",
    status: WitnessStatus.ACKNOWLEDGED,
    acknowledgedAt: new Date(),
    userId: "user-1",
    user: { firstName: "Alhaji", lastName: "Sule" },
    transaction: {
      id: "tx-1",
      type: TransactionType.GIVEN,
      amount: { toNumber: () => 50000 },
      currency: "NGN",
      createdById: "creator-1",
      createdBy: { firstName: "Musa", lastName: "Ibrahim" },
      contact: {
        firstName: "Aminu",
        lastName: "Bello",
        phoneNumber: "+2348012345678",
        email: "aminu@example.com",
      },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// findMyRequests pagination
// ---------------------------------------------------------------------------

describe("WitnessesService — findMyRequests pagination", () => {
  let service: WitnessesService;
  let prisma: {
    witness: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      witness: { findMany: jest.fn(), count: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        WitnessesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: {
            sendTransactionWitnessInvite: jest.fn(),
            sendContactNotification: jest
              .fn()
              .mockResolvedValue({ smsSkipped: false }),
          },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(WitnessesService);
  });

  it("returns paginated witnesses with total", async () => {
    prisma.witness.findMany.mockResolvedValue([{ id: "w1" }]);
    prisma.witness.count.mockResolvedValue(1);

    const result = await service.findMyRequests("user-1", {
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// acknowledge()
// ---------------------------------------------------------------------------

describe("WitnessesService — acknowledge()", () => {
  let service: WitnessesService;
  let prisma: {
    witness: {
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
    };
    transactionHistory: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let notificationService: { sendContactNotification: jest.Mock };

  beforeEach(async () => {
    prisma = {
      witness: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      transactionHistory: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn) => fn(prisma)),
    };

    notificationService = {
      sendContactNotification: jest
        .fn()
        .mockResolvedValue({ smsSkipped: false }),
    };

    const module = await Test.createTestingModule({
      providers: [
        WitnessesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: {
            sendTransactionWitnessInvite: jest.fn(),
            ...notificationService,
          },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(WitnessesService);
  });

  it("sends contact notification on first ACKNOWLEDGED witness for GIVEN transaction with phone", async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(makeUpdatedWitness());
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0); // first acknowledgment

    await service.acknowledge(
      "witness-1",
      WitnessStatus.ACKNOWLEDGED,
      "user-1",
    );

    expect(notificationService.sendContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: "GIVEN",
        witnessDisplayName: "Alhaji Sule",
        creatorDisplayName: "Musa Ibrahim",
        contactPhoneNumber: "+2348012345678",
      }),
    );
  });

  it("does not send contact notification when a previous ACKNOWLEDGED witness exists", async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(makeUpdatedWitness());
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(1); // already acknowledged by someone else

    await service.acknowledge(
      "witness-1",
      WitnessStatus.ACKNOWLEDGED,
      "user-1",
    );

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it("does not send contact notification when status is DECLINED", async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        status: WitnessStatus.DECLINED,
        acknowledgedAt: null,
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});

    await service.acknowledge("witness-1", WitnessStatus.DECLINED, "user-1");

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it("does not send contact notification when contact has no phone or email", async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        transaction: {
          id: "tx-1",
          type: TransactionType.GIVEN,
          amount: { toNumber: () => 50000 },
          currency: "NGN",
          createdById: "creator-1",
          createdBy: { firstName: "Musa", lastName: "Ibrahim" },
          contact: {
            firstName: "Aminu",
            lastName: "Bello",
            phoneNumber: null,
            email: null,
          },
        },
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0);

    await service.acknowledge(
      "witness-1",
      WitnessStatus.ACKNOWLEDGED,
      "user-1",
    );

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it("does not send contact notification for GIFT transaction type", async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        transaction: {
          id: "tx-1",
          type: TransactionType.GIFT,
          amount: { toNumber: () => 5000 },
          currency: "NGN",
          createdById: "creator-1",
          createdBy: { firstName: "Musa", lastName: "Ibrahim" },
          contact: {
            firstName: "Aminu",
            lastName: "Bello",
            phoneNumber: "+2348012345678",
            email: null,
          },
        },
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0);

    await service.acknowledge(
      "witness-1",
      WitnessStatus.ACKNOWLEDGED,
      "user-1",
    );

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it("does not send contact notification when transaction has no contact", async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        transaction: {
          id: "tx-1",
          type: TransactionType.GIVEN,
          amount: { toNumber: () => 50000 },
          currency: "NGN",
          createdById: "creator-1",
          createdBy: { firstName: "Musa", lastName: "Ibrahim" },
          contact: null,
        },
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0);

    await service.acknowledge(
      "witness-1",
      WitnessStatus.ACKNOWLEDGED,
      "user-1",
    );

    expect(notificationService.sendContactNotification).not.toHaveBeenCalled();
  });

  it("sends notification via email path when contact has email but no phone", async () => {
    prisma.witness.findUnique.mockResolvedValue(makeWitness());
    prisma.witness.update.mockResolvedValue(
      makeUpdatedWitness({
        transaction: {
          id: "tx-1",
          type: TransactionType.RECEIVED,
          amount: { toNumber: () => 20000 },
          currency: "NGN",
          createdById: "creator-1",
          createdBy: { firstName: "Musa", lastName: "Ibrahim" },
          contact: {
            firstName: "Aminu",
            lastName: "Bello",
            phoneNumber: null,
            email: "aminu@example.com",
          },
        },
      }),
    );
    prisma.transactionHistory.create.mockResolvedValue({});
    prisma.witness.count.mockResolvedValue(0);

    await service.acknowledge(
      "witness-1",
      WitnessStatus.ACKNOWLEDGED,
      "user-1",
    );

    expect(notificationService.sendContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: "RECEIVED",
        contactEmail: "aminu@example.com",
        contactPhoneNumber: null,
      }),
    );
  });
});
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api test witnesses.service 2>&1 | tail -30
```

Expected: The `findMyRequests` test passes. The `acknowledge()` tests fail — `sendContactNotification` is not called (it doesn't exist in the method yet).

- [ ] **Step 1.3: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/witnesses/witnesses.service.spec.ts && git commit -m "test(witnesses): add failing tests for acknowledge() contact notification"
```

---

## Task 2: Update job data interfaces

**Files:**

- Modify: `apps/api/src/modules/notifications/interfaces/job-data.interface.ts`

- [ ] **Step 2.1: Add `witnessDisplayName` and `transactionType` to both interfaces**

Replace the entire file with:

```typescript
export interface EmailJobData {
  to: string;
  subject: string;
  templateName: string;
  templateData: Record<string, unknown>;
}

export interface SmsJobData {
  to: string;
  body: string;
}

export interface ContactNotificationSmsJobData {
  type: "contact-notification-sms";
  transactionId: string;
  contactPhoneNumber: string;
  contactFirstName: string | null;
  creatorId: string;
  creatorDisplayName: string;
  amount: number;
  currency: string;
  witnessDisplayName: string;
  transactionType: string;
}

export interface ContactNotificationEmailJobData {
  type: "contact-notification-email";
  transactionId: string;
  contactEmail: string;
  contactFirstName: string | null;
  creatorDisplayName: string;
  amount: number;
  currency: string;
  witnessDisplayName: string;
  transactionType: string;
}

export interface ProvisioningNotificationJobData {
  type: "provisioning-notification";
  notificationType: "granted" | "expired" | "revoked";
  email: string;
  name: string;
  expiresAt?: string;
  expiredAt?: string;
}

export interface RoleChangeNotificationJobData {
  type: "role-change-notification";
  notificationType: "promoted" | "demoted";
  email: string;
  name: string;
}

export type NotificationJobData =
  | EmailJobData
  | SmsJobData
  | ContactNotificationSmsJobData
  | ContactNotificationEmailJobData
  | ProvisioningNotificationJobData
  | RoleChangeNotificationJobData;
```

- [ ] **Step 2.2: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/notifications/interfaces/job-data.interface.ts && git commit -m "feat(notifications): add witnessDisplayName and transactionType to contact notification job data"
```

---

## Task 3: Update `sendContactNotification()` and remove old call from transactions service

These two changes are done together so the codebase compiles at the commit boundary.

**Files:**

- Modify: `apps/api/src/modules/notifications/notification.service.ts`
- Modify: `apps/api/src/modules/transactions/transactions.service.ts`

- [ ] **Step 3.1: Update `sendContactNotification()` in notification.service.ts**

Find the `sendContactNotification` method (lines 410–480). Replace the method signature and both queue payloads. The full updated method body:

```typescript
async sendContactNotification(params: {
  transactionId: string;
  contactPhoneNumber?: string | null;
  contactEmail?: string | null;
  contactFirstName?: string | null;
  creatorId: string;
  creatorDisplayName: string;
  amount: number;
  currency: string;
  witnessDisplayName: string;
  transactionType: string;
}): Promise<{ smsSkipped: boolean }> {
  const {
    transactionId,
    contactPhoneNumber,
    contactEmail,
    contactFirstName,
    creatorId,
    creatorDisplayName,
    amount,
    currency,
    witnessDisplayName,
    transactionType,
  } = params;

  let smsSkipped = false;

  // SMS — gated by contactNotificationSms tier limit
  if (contactPhoneNumber) {
    const canSend = await this.subscriptionService.canUseFeature(
      creatorId,
      'contactNotificationSms',
    );

    if (!canSend) {
      smsSkipped = true;
    } else {
      await this.notificationsQueue.add(
        'contact-notification-sms',
        {
          type: 'contact-notification-sms',
          transactionId,
          contactPhoneNumber,
          contactFirstName: contactFirstName ?? null,
          creatorId,
          creatorDisplayName,
          amount,
          currency,
          witnessDisplayName,
          transactionType,
        } as ContactNotificationSmsJobData,
        {
          attempts: 3,
          backoff: { type: 'fixed', delay: 5000 },
          removeOnComplete: true,
        },
      );
    }
  }

  // Email — unlimited for all tiers
  if (contactEmail) {
    await this.notificationsQueue.add(
      'contact-notification-email',
      {
        type: 'contact-notification-email',
        transactionId,
        contactEmail,
        contactFirstName: contactFirstName ?? null,
        creatorDisplayName,
        amount,
        currency,
        witnessDisplayName,
        transactionType,
      } as ContactNotificationEmailJobData,
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    );
  }

  return { smsSkipped };
}
```

- [ ] **Step 3.2: Remove `sendContactNotification` from transactions.service.ts**

In `apps/api/src/modules/transactions/transactions.service.ts`, find the block that begins at the comment `// Contact notification for qualifying transaction types` (around line 425). Remove everything from that comment through `return { ...transaction, smsSkipped };` and replace the return statement with:

```typescript
return transaction;
```

The block to remove looks like:

```typescript
// Contact notification for qualifying transaction types
const qualifyingTypes = [
  TransactionType.GIVEN,
  TransactionType.RECEIVED,
  TransactionType.RETURNED,
];

let smsSkipped = false;

if (
  (qualifyingTypes as TransactionType[]).includes(transaction.type) &&
  transaction.contactId
) {
  const [contact, creator] = await Promise.all([
    this.prisma.contact.findUnique({
      where: { id: transaction.contactId },
    }),
    this.prisma.user.findUnique({ where: { id: userId } }),
  ]);

  if (contact && creator) {
    const result = await this.notificationService
      .sendContactNotification({
        transactionId: transaction.id,
        contactPhoneNumber: contact.phoneNumber ?? null,
        contactEmail: contact.email ?? null,
        contactFirstName: contact.firstName ?? null,
        creatorId: creator.id,
        creatorDisplayName: creator.firstName ?? creator.email,
        amount: transaction.amount?.toNumber() ?? 0,
        currency: transaction.currency,
      })
      .catch((err) => {
        console.error("Failed to send contact notifications:", err);
        return { smsSkipped: false };
      });

    smsSkipped = result.smsSkipped;
  }
}

return { ...transaction, smsSkipped };
```

Replace `return { ...transaction, smsSkipped };` with `return transaction;`.

- [ ] **Step 3.3: Verify the backend compiles**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api build 2>&1 | tail -10
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3.4: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/notifications/notification.service.ts apps/api/src/modules/transactions/transactions.service.ts && git commit -m "refactor(notifications): add witness context to sendContactNotification; remove call from transaction creation"
```

---

## Task 4: Update notification processor handlers

**Files:**

- Modify: `apps/api/src/modules/notifications/notifications.processor.ts`

- [ ] **Step 4.1: Update `handleContactNotificationSms`**

Find the `handleContactNotificationSms` private method (lines ~135–162). Replace it with:

```typescript
private async handleContactNotificationSms(
  data: ContactNotificationSmsJobData,
): Promise<void> {
  const {
    contactPhoneNumber,
    contactFirstName,
    creatorDisplayName,
    amount,
    currency,
    creatorId,
    witnessDisplayName,
    transactionType,
  } = data;

  const optedOut = await this.smsOptOutService.isOptedOut(contactPhoneNumber);
  if (optedOut) {
    this.logger.log(`Skipping SMS to ${contactPhoneNumber} — opted out`);
    return;
  }

  const name = contactFirstName ?? 'Someone';
  const formattedAmount = this.formatAmount(amount, currency);
  const appUrl = this.configService
    .get<string>('app.url')
    ?.replace(/\/$/, '');

  const typeLabels: Record<string, string> = {
    GIVEN: 'loan',
    RECEIVED: 'credit',
    RETURNED: 'repayment',
  };
  const typeLabel = typeLabels[transactionType] ?? 'transaction';

  const body = `${name}, ${creatorDisplayName} has recorded a ${typeLabel} of ${formattedAmount} in your name on Wathīqah. This has been witnessed and confirmed by ${witnessDisplayName}. View your record at ${appUrl}. Reply STOP to opt out.`;

  await this.smsProvider.sendSms({ to: contactPhoneNumber, body });
  await this.subscriptionService.incrementFeatureUsage(
    creatorId,
    'contactNotificationSms',
  );
  this.logger.log(`Contact notification SMS sent to ${contactPhoneNumber}`);
}
```

- [ ] **Step 4.2: Update `handleContactNotificationEmail`**

Find the `handleContactNotificationEmail` private method (lines ~164–185). Replace it with:

```typescript
private async handleContactNotificationEmail(
  data: ContactNotificationEmailJobData,
): Promise<void> {
  const {
    contactEmail,
    contactFirstName,
    creatorDisplayName,
    amount,
    currency,
    witnessDisplayName,
    transactionType,
  } = data;

  const name = contactFirstName ?? 'Someone';
  const formattedAmount = this.formatAmount(amount, currency);
  const subject =
    'A witnessed transaction has been recorded in your name on Wathīqah';

  const typeLabels: Record<string, string> = {
    GIVEN: 'loan',
    RECEIVED: 'credit',
    RETURNED: 'repayment',
  };
  const typeLabel = typeLabels[transactionType] ?? 'transaction';

  await this.handleSendEmail({
    to: contactEmail,
    subject,
    templateName: 'contact-transaction-notification',
    templateData: {
      name,
      creatorDisplayName,
      formattedAmount,
      witnessDisplayName,
      typeLabel,
      subject,
    },
  });

  this.logger.log(`Contact notification email sent to ${contactEmail}`);
}
```

- [ ] **Step 4.3: Run backend tests**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api test 2>&1 | tail -15
```

Expected: All existing tests pass. The `acknowledge()` tests still fail (contact notification not yet wired in witnesses.service).

- [ ] **Step 4.4: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/notifications/notifications.processor.ts && git commit -m "feat(notifications): enrich contact notification SMS and email with witness name and transaction type"
```

---

## Task 5: Update email templates

**Files:**

- Modify: `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.html.hbs`
- Modify: `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.txt.hbs`

- [ ] **Step 5.1: Update the HTML template**

Replace the full content of `contact-transaction-notification.html.hbs` with:

```handlebars
{{#> layout }}
    <h2>Hello {{name}},</h2>
    <p>
      <strong>{{creatorDisplayName}}</strong> has recorded a
      <strong>{{typeLabel}}</strong> of <strong>{{formattedAmount}}</strong>
      in your name on Wathīqah.
    </p>
    <p>
      This transaction has been witnessed and confirmed by
      <strong>{{witnessDisplayName}}</strong>.
    </p>
    <p>
      Wathīqah is a trust and documentation platform. This record is securely
      stored and available for you to review at any time.
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{appUrl}}" style="background-color: #2196F3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          View Your Record
        </a>
    </div>
    <p style="font-size: 0.9em; color: #666;">If the button doesn't work, visit: {{appUrl}}</p>
    <p style="font-size: 0.9em; color: #666;">
      You received this email because a transaction was recorded against your contact information.
    </p>
{{/layout}}
```

- [ ] **Step 5.2: Update the plain text template**

Replace the full content of `contact-transaction-notification.txt.hbs` with:

```
Hello {{name}},

{{creatorDisplayName}} has recorded a {{typeLabel}} of {{formattedAmount}} in your name on Wathīqah.

This transaction has been witnessed and confirmed by {{witnessDisplayName}}.

Wathīqah is a trust and documentation platform. This record is securely stored and available for you to review at any time.

View your record at: {{appUrl}}

You received this email because a transaction was recorded against your contact information.
```

- [ ] **Step 5.3: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/notifications/templates/email/contact-transaction-notification.html.hbs apps/api/src/modules/notifications/templates/email/contact-transaction-notification.txt.hbs && git commit -m "feat(notifications): update contact notification email templates with witness and transaction type"
```

---

## Task 6: Implement contact notification in `witnesses.service.ts` (make tests green)

**Files:**

- Modify: `apps/api/src/modules/witnesses/witnesses.service.ts`

- [ ] **Step 6.1: Add `Logger` and `TransactionType` imports**

Update the import lines at the top of `witnesses.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WitnessStatus, TransactionType } from "../../generated/prisma/client";
import { FilterWitnessInput } from "./dto/filter-witness.input";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { NotificationService } from "../notifications/notification.service";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import { hashToken } from "../../common/utils/crypto.utils";
import * as ms from "ms";
```

- [ ] **Step 6.2: Add logger property to the class**

After the class declaration `export class WitnessesService {`, add:

```typescript
private readonly logger = new Logger(WitnessesService.name);
```

- [ ] **Step 6.3: Replace the `acknowledge()` method**

Replace the entire `acknowledge()` method (lines 28–91) with:

```typescript
async acknowledge(witnessId: string, status: WitnessStatus, userId: string) {
  const witness = await this.prisma.witness.findUnique({
    where: { id: witnessId },
  });

  if (!witness) {
    throw new NotFoundException(
      `Witness record with ID ${witnessId} not found`,
    );
  }

  if (witness.userId !== userId) {
    throw new ForbiddenException(
      'You are not authorized to update this witness record',
    );
  }

  const result = await this.prisma.$transaction(async (prisma) => {
    const updatedWitness = await prisma.witness.update({
      where: { id: witnessId },
      data: {
        status,
        acknowledgedAt:
          status === WitnessStatus.ACKNOWLEDGED ? new Date() : null,
      },
      include: {
        transaction: {
          include: {
            createdBy: true,
            contact: true,
          },
        },
        user: true,
      },
    });

    await prisma.transactionHistory.create({
      data: {
        transactionId: updatedWitness.transactionId,
        userId,
        changeType: `WITNESS_${status}`,
        previousState: {
          witnessStatus: witness.status,
          witnessName: `${updatedWitness.user.firstName} ${updatedWitness.user.lastName}`,
        },
        newState: {
          witnessStatus: status,
          witnessName: `${updatedWitness.user.firstName} ${updatedWitness.user.lastName}`,
          transactionDetails: {
            creator: `${updatedWitness.transaction.createdBy.firstName} ${updatedWitness.transaction.createdBy.lastName}`,
            contact: updatedWitness.transaction.contact
              ? `${updatedWitness.transaction.contact.firstName} ${updatedWitness.transaction.contact.lastName}`
              : 'N/A',
            amount: updatedWitness.transaction.amount,
            currency: updatedWitness.transaction.currency,
            category: updatedWitness.transaction.category,
          },
        },
      },
    });

    return updatedWitness;
  });

  // Send contact notification on the first acknowledgment only
  if (status === WitnessStatus.ACKNOWLEDGED) {
    const { transaction } = result;
    const qualifyingTypes: TransactionType[] = [
      TransactionType.GIVEN,
      TransactionType.RECEIVED,
      TransactionType.RETURNED,
    ];

    const hasContact =
      transaction.contact &&
      (transaction.contact.phoneNumber || transaction.contact.email);

    if (qualifyingTypes.includes(transaction.type) && hasContact) {
      const previousAcknowledgements = await this.prisma.witness.count({
        where: {
          transactionId: transaction.id,
          id: { not: witnessId },
          status: WitnessStatus.ACKNOWLEDGED,
        },
      });

      if (previousAcknowledgements === 0) {
        const witnessDisplayName =
          `${result.user.firstName} ${result.user.lastName}`.trim();
        const creatorDisplayName =
          `${transaction.createdBy.firstName} ${transaction.createdBy.lastName}`.trim();

        await this.notificationService
          .sendContactNotification({
            transactionId: transaction.id,
            contactPhoneNumber: transaction.contact!.phoneNumber ?? null,
            contactEmail: transaction.contact!.email ?? null,
            contactFirstName: transaction.contact!.firstName ?? null,
            creatorId: transaction.createdById,
            creatorDisplayName,
            amount: transaction.amount?.toNumber() ?? 0,
            currency: transaction.currency,
            witnessDisplayName,
            transactionType: transaction.type,
          })
          .catch((err) => {
            this.logger.error('Failed to send contact notification after witness acknowledgment', err);
          });
      }
    }
  }

  return result;
}
```

- [ ] **Step 6.4: Run the witness service tests — all should pass**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api test witnesses.service 2>&1 | tail -20
```

Expected: All 8 tests pass (1 pagination + 7 acknowledge).

- [ ] **Step 6.5: Run full backend test suite**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter api test 2>&1 | tail -15
```

Expected: All tests pass, no regressions.

- [ ] **Step 6.6: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/witnesses/witnesses.service.ts && git commit -m "feat(witnesses): send contact notification on first witness acknowledgment"
```

---

## Task 7: Remove `smsSkipped` from the transaction entity

**Files:**

- Modify: `apps/api/src/modules/transactions/entities/transaction.entity.ts`

- [ ] **Step 7.1: Remove the `smsSkipped` field**

In `transaction.entity.ts`, remove lines 106–112 (the transient `smsSkipped` field):

```typescript
  /**
   * Transient field — not stored in the database.
   * True when the contact SMS was skipped because the creator has reached
   * their free-tier contactNotificationSms monthly limit.
   */
  @Field(() => Boolean, { nullable: true })
  smsSkipped?: boolean;
```

- [ ] **Step 7.2: Regenerate the GraphQL schema**

Start the API server briefly to regenerate `schema.gql` (it auto-generates on startup):

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && timeout 15 pnpm --filter api dev 2>&1 | grep -E "(Schema|smsSkipped|started|error)" || true
```

Expected: NestJS starts, schema regenerates without `smsSkipped`. The `timeout 15` stops it after 15 seconds.

- [ ] **Step 7.3: Verify `smsSkipped` is gone from the schema**

```bash
grep -n "smsSkipped" /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah/apps/api/src/schema.gql
```

Expected: No output (field removed).

- [ ] **Step 7.4: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/api/src/modules/transactions/entities/transaction.entity.ts apps/api/src/schema.gql && git commit -m "refactor(transactions): remove smsSkipped transient field from Transaction entity"
```

---

## Task 8: Frontend cleanup

**Files:**

- Modify: `apps/web/src/lib/apollo/queries/transactions.ts`
- Modify: `apps/web/src/routes/transactions/new.tsx`
- Modify: `apps/web/src/routes/items/new.tsx`

- [ ] **Step 8.1: Remove `smsSkipped` from the mutation fragment**

In `apps/web/src/lib/apollo/queries/transactions.ts`, find the `CREATE_TRANSACTION` mutation (around line 237). Remove `smsSkipped` from the selection set:

Before:

```graphql
    createTransaction(input: $input) {
      id
      amount
      type
      currency
      description
      date
      parentId
      smsSkipped
    }
```

After:

```graphql
    createTransaction(input: $input) {
      id
      amount
      type
      currency
      description
      date
      parentId
    }
```

- [ ] **Step 8.2: Regenerate frontend GraphQL types**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter web codegen 2>&1 | tail -10
```

Expected: Codegen succeeds. `smsSkipped` no longer appears in generated types.

- [ ] **Step 8.3: Remove `smsSkipped` toast from transactions/new.tsx**

In `apps/web/src/routes/transactions/new.tsx`, find lines 210–216:

```typescript
if (result.data?.createTransaction.smsSkipped) {
  toast.warning(
    "Transaction saved. SMS not sent — you've reached your 10 free contact notifications this month. Upgrade to Pro for unlimited notifications.",
  );
} else {
  toast.success("Transaction created successfully");
}
```

Replace with:

```typescript
toast.success("Transaction created successfully");
```

- [ ] **Step 8.4: Remove `smsSkipped` toast from items/new.tsx**

In `apps/web/src/routes/items/new.tsx`, find lines 23–29:

```typescript
if (result.data?.createTransaction.smsSkipped) {
  toast.warning(
    "Transaction saved. SMS not sent — you've reached your 10 free contact notifications this month. Upgrade to Pro for unlimited notifications.",
  );
} else {
  toast.success("Item transaction recorded successfully");
}
```

Replace with:

```typescript
toast.success("Item transaction recorded successfully");
```

- [ ] **Step 8.5: Run frontend tests**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && pnpm --filter web test 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 8.6: Commit**

```bash
cd /Users/fawazabdganiyu/akanors-ventures/apps/wathiqah && git add apps/web/src/lib/apollo/queries/transactions.ts apps/web/src/routes/transactions/new.tsx apps/web/src/routes/items/new.tsx apps/web/src/types/__generated__/graphql.ts && git commit -m "refactor(web): remove smsSkipped from transaction mutation and creation UI"
```
