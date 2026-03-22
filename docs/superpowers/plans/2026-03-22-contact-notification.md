# Contact Notification (SMS + Email) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a qualifying transaction (GIVEN, RECEIVED, RETURNED) is created against a contact, automatically notify the contact via SMS (free tier: 10/month; pro: unlimited) and/or email (unlimited), giving them real-time proof of the record.

**Architecture:** BullMQ jobs (`contact-notification-sms`, `contact-notification-email`) enqueued from `TransactionsService` after creation. The SMS free-tier limit is checked synchronously in `NotificationService.sendContactNotification()` before enqueuing, so the `smsSkipped` flag is available in the mutation response. Opt-outs are persisted to a `SmsOptOut` table via a Twilio webhook.

**Tech Stack:** NestJS, Prisma 7, BullMQ, Twilio (SMS), Handlebars (email templates), Atlas (migrations), Apollo Client (frontend), Sonner (toasts)

**Spec:** `docs/superpowers/specs/2026-03-21-contact-notification-sms-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `apps/api/src/modules/notifications/services/sms-optout.service.ts` | isOptedOut / addOptOut |
| Create | `apps/api/src/modules/notifications/services/sms-optout.service.spec.ts` | Unit tests for SmsOptOutService |
| Create | `apps/api/src/modules/notifications/notifications.controller.ts` | Twilio opt-out webhook endpoint |
| Create | `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.html.hbs` | HTML email template |
| Create | `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.txt.hbs` | Plain text email template |
| Modify | `apps/api/prisma/schema.prisma` | Add SmsOptOut model + OptOutSource enum |
| Modify | `apps/api/src/modules/notifications/interfaces/job-data.interface.ts` | Add two new job data types |
| Modify | `apps/api/src/modules/subscription/subscription.constants.ts` | Add contactNotificationSms to TierLimits |
| Modify | `apps/api/src/modules/notifications/notification.service.ts` | Add sendContactNotification() method |
| Modify | `apps/api/src/modules/notifications/notifications.processor.ts` | Add two new job handlers + SmsOptOutService + SubscriptionService |
| Modify | `apps/api/src/modules/notifications/notifications.module.ts` | Register SmsOptOutService + NotificationsController |
| Modify | `apps/api/src/modules/transactions/entities/transaction.entity.ts` | Add smsSkipped transient field |
| Modify | `apps/api/src/modules/transactions/transactions.service.ts` | Call sendContactNotification() after create |
| Modify | `apps/web/src/lib/apollo/queries/transactions.ts` | Add smsSkipped to CREATE_TRANSACTION response fields |
| Modify | `apps/web/src/hooks/useTransactions.ts` | Surface smsSkipped from mutation result |
| Modify | `apps/web/src/routes/transactions/new.tsx` | Show upgrade toast when smsSkipped is true |
| Modify | `apps/web/src/routes/items/new.tsx` | Show upgrade toast when smsSkipped is true |

---

## Task 1: Database Schema — SmsOptOut Model

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add SmsOptOut model and OptOutSource enum to schema.prisma**

Open `apps/api/prisma/schema.prisma` and append before the final closing brace (after existing models):

```prisma
enum OptOutSource {
  REPLY_STOP
  MANUAL
}

model SmsOptOut {
  id          String       @id @default(cuid())
  phoneNumber String       @unique
  source      OptOutSource
  createdAt   DateTime     @default(now())
}
```

- [ ] **Step 2: Generate Atlas migration diff**

```bash
pnpm --filter api db:migrate
```

Expected: A new migration file created under `apps/api/prisma/migrations/` containing `CREATE TYPE "OptOutSource"` and `CREATE TABLE "SmsOptOut"`.

- [ ] **Step 3: Regenerate Prisma client**

```bash
pnpm --filter api db:generate
```

Expected: `apps/api/src/generated/prisma/` updated; `SmsOptOut`, `OptOutSource` exported from client.

- [ ] **Step 4: Verify generated types**

```bash
grep -r "SmsOptOut\|OptOutSource" apps/api/src/generated/prisma/
```

Expected: Both names appear in the generated output.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(db): add SmsOptOut model and OptOutSource enum"
```

---

## Task 2: Subscription Constants — contactNotificationSms

**Files:**
- Modify: `apps/api/src/modules/subscription/subscription.constants.ts`

- [ ] **Step 1: Write a failing test**

Create `apps/api/src/modules/subscription/subscription.constants.spec.ts`:

```typescript
import { SUBSCRIPTION_LIMITS, TierLimits } from './subscription.constants';
import { SubscriptionTier } from '../../generated/prisma/client';

describe('SUBSCRIPTION_LIMITS', () => {
  it('defines contactNotificationSms on TierLimits interface', () => {
    const freeLimits: TierLimits = SUBSCRIPTION_LIMITS[SubscriptionTier.FREE];
    expect(typeof freeLimits.contactNotificationSms).toBe('number');
  });

  it('sets FREE tier contactNotificationSms to 10', () => {
    expect(SUBSCRIPTION_LIMITS[SubscriptionTier.FREE].contactNotificationSms).toBe(10);
  });

  it('sets PRO tier contactNotificationSms to -1 (unlimited)', () => {
    expect(SUBSCRIPTION_LIMITS[SubscriptionTier.PRO].contactNotificationSms).toBe(-1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- --testPathPattern="subscription.constants" --no-coverage
```

Expected: FAIL — `contactNotificationSms` does not exist on the type.

- [ ] **Step 3: Add contactNotificationSms to TierLimits and both tier objects**

In `apps/api/src/modules/subscription/subscription.constants.ts`:

```typescript
export interface TierLimits {
  maxContacts: number;
  maxWitnessesPerMonth: number;
  allowSMS: boolean;
  allowAdvancedAnalytics: boolean;
  allowProfessionalReports: boolean;
  contactNotificationSms: number;  // 10 for FREE, -1 for PRO (unlimited)
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    maxContacts: 50,
    maxWitnessesPerMonth: 10,
    allowSMS: false,
    allowAdvancedAnalytics: false,
    allowProfessionalReports: false,
    contactNotificationSms: 10,
  },
  [SubscriptionTier.PRO]: {
    maxContacts: -1,
    maxWitnessesPerMonth: -1,
    allowSMS: true,
    allowAdvancedAnalytics: true,
    allowProfessionalReports: true,
    contactNotificationSms: -1,
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter api test -- --testPathPattern="subscription.constants" --no-coverage
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/subscription/subscription.constants.ts apps/api/src/modules/subscription/subscription.constants.spec.ts
git commit -m "feat(subscription): add contactNotificationSms tier limit"
```

---

## Task 3: SmsOptOutService

**Files:**
- Create: `apps/api/src/modules/notifications/services/sms-optout.service.ts`
- Create: `apps/api/src/modules/notifications/services/sms-optout.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/notifications/services/sms-optout.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SmsOptOutService } from './sms-optout.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OptOutSource } from '../../../generated/prisma/client';

const mockPrisma = {
  smsOptOut: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('SmsOptOutService', () => {
  let service: SmsOptOutService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsOptOutService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SmsOptOutService>(SmsOptOutService);
    jest.clearAllMocks();
  });

  describe('isOptedOut', () => {
    it('returns false when phone number is not in opt-out list', async () => {
      mockPrisma.smsOptOut.findUnique.mockResolvedValue(null);
      expect(await service.isOptedOut('+2348000000000')).toBe(false);
    });

    it('returns true when phone number is in opt-out list', async () => {
      mockPrisma.smsOptOut.findUnique.mockResolvedValue({
        id: '1',
        phoneNumber: '+2348000000000',
        source: OptOutSource.REPLY_STOP,
        createdAt: new Date(),
      });
      expect(await service.isOptedOut('+2348000000000')).toBe(true);
    });
  });

  describe('addOptOut', () => {
    it('upserts an opt-out record with the given source', async () => {
      mockPrisma.smsOptOut.upsert.mockResolvedValue({});
      await service.addOptOut('+2348000000000', OptOutSource.REPLY_STOP);
      expect(mockPrisma.smsOptOut.upsert).toHaveBeenCalledWith({
        where: { phoneNumber: '+2348000000000' },
        create: { phoneNumber: '+2348000000000', source: OptOutSource.REPLY_STOP },
        update: { source: OptOutSource.REPLY_STOP },
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- --testPathPattern="sms-optout.service" --no-coverage
```

Expected: FAIL — `SmsOptOutService` not found.

- [ ] **Step 3: Create SmsOptOutService**

Create `apps/api/src/modules/notifications/services/sms-optout.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OptOutSource } from '../../../generated/prisma/client';

@Injectable()
export class SmsOptOutService {
  constructor(private readonly prisma: PrismaService) {}

  async isOptedOut(phoneNumber: string): Promise<boolean> {
    const record = await this.prisma.smsOptOut.findUnique({
      where: { phoneNumber },
    });
    return record !== null;
  }

  async addOptOut(phoneNumber: string, source: OptOutSource): Promise<void> {
    await this.prisma.smsOptOut.upsert({
      where: { phoneNumber },
      create: { phoneNumber, source },
      update: { source },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter api test -- --testPathPattern="sms-optout.service" --no-coverage
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/notifications/services/
git commit -m "feat(notifications): add SmsOptOutService"
```

---

## Task 4: Job Data Interfaces

**Files:**
- Modify: `apps/api/src/modules/notifications/interfaces/job-data.interface.ts`

- [ ] **Step 1: Replace the file contents with the expanded union**

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
  type: 'contact-notification-sms';
  transactionId: string;
  contactPhoneNumber: string;
  contactFirstName: string | null;
  creatorId: string;
  creatorDisplayName: string;
  amount: number;
  currency: string;
}

export interface ContactNotificationEmailJobData {
  type: 'contact-notification-email';
  transactionId: string;
  contactEmail: string;
  contactFirstName: string | null;
  creatorDisplayName: string;
  amount: number;
  currency: string;
}

export type NotificationJobData =
  | EmailJobData
  | SmsJobData
  | ContactNotificationSmsJobData
  | ContactNotificationEmailJobData;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter api build 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new TypeScript errors related to `job-data.interface.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/notifications/interfaces/job-data.interface.ts
git commit -m "feat(notifications): add contact notification job data types"
```

---

## Task 5: Email Templates

**Files:**
- Create: `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.html.hbs`
- Create: `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.txt.hbs`

- [ ] **Step 1: Create HTML template**

Create `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.html.hbs`:

```handlebars
{{#> layout }}
    <h2>Hello {{name}},</h2>
    <p>A transaction of <strong>{{amount}} {{currency}}</strong> has been recorded in your name by <strong>{{creatorDisplayName}}</strong> on Wathīqah.</p>

    <p>Wathīqah is a trust and documentation platform. This record is securely stored and available for you to review at any time.</p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{appUrl}}" style="background-color: #2196F3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Your Record</a>
    </div>
    <p style="font-size: 0.9em; color: #666;">If the button doesn't work, visit: {{appUrl}}</p>
    <p style="font-size: 0.9em; color: #666;">You received this email because a transaction was recorded against your contact information.</p>
{{/layout}}
```

- [ ] **Step 2: Create plain text template**

Create `apps/api/src/modules/notifications/templates/email/contact-transaction-notification.txt.hbs`:

```handlebars
Hello {{name}},

A transaction of {{amount}} {{currency}} has been recorded in your name by {{creatorDisplayName}} on Wathīqah.

Wathīqah is a trust and documentation platform. This record is securely stored and available for you to review at any time.

View your record at: {{appUrl}}

You received this email because a transaction was recorded against your contact information.
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/notifications/templates/email/contact-transaction-notification.html.hbs apps/api/src/modules/notifications/templates/email/contact-transaction-notification.txt.hbs
git commit -m "feat(notifications): add contact transaction notification email templates"
```

---

## Task 6: NotificationService — sendContactNotification

**Files:**
- Modify: `apps/api/src/modules/notifications/notification.service.ts`

- [ ] **Step 1: Add imports for new job data types**

At the top of `notification.service.ts`, update the import from `job-data.interface.ts`:

```typescript
import type {
  NotificationJobData,
  ContactNotificationSmsJobData,
  ContactNotificationEmailJobData,
} from './interfaces/job-data.interface';
```

- [ ] **Step 2: Add the sendContactNotification method**

Append to `NotificationService` (before the closing `}`):

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
  } = params;

  let smsSkipped = false;

  // SMS notification — gated by contactNotificationSms tier limit
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
        } as ContactNotificationSmsJobData,
        {
          attempts: 3,
          backoff: { type: 'fixed', delay: 5000 },
          removeOnComplete: true,
        },
      );
    }
  }

  // Email notification — unlimited for all tiers
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

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter api build 2>&1 | grep -E "error TS" | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/notifications/notification.service.ts
git commit -m "feat(notifications): add sendContactNotification method"
```

---

## Task 7: NotificationsProcessor — New Job Handlers

**Files:**
- Modify: `apps/api/src/modules/notifications/notifications.processor.ts`

- [ ] **Step 1: Write failing tests for the new handlers**

Create `apps/api/src/modules/notifications/notifications.processor.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsProcessor } from './notifications.processor';
import { SmsOptOutService } from './services/sms-optout.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';
import { TemplateService } from './template.service';
import { ConfigService } from '@nestjs/config';
import type { ContactNotificationSmsJobData, ContactNotificationEmailJobData } from './interfaces/job-data.interface';

const mockSmsOptOutService = { isOptedOut: jest.fn() };
const mockSubscriptionService = { incrementFeatureUsage: jest.fn() };
const mockSmsProvider = { sendSms: jest.fn() };
const mockEmailProvider = { sendEmail: jest.fn() };
const mockTemplateService = { render: jest.fn().mockReturnValue('<html>test</html>') };
const mockConfigService = { get: jest.fn().mockReturnValue('https://wathiqah.akanors.com') };

const makeSmsJob = (overrides: Partial<ContactNotificationSmsJobData> = {}) =>
  ({
    name: 'contact-notification-sms',
    data: {
      type: 'contact-notification-sms' as const,
      transactionId: 'tx1',
      contactPhoneNumber: '+2348012345678',
      contactFirstName: 'Amina',
      creatorId: 'user1',
      creatorDisplayName: 'Fawaz',
      amount: 5000,
      currency: 'NGN',
      ...overrides,
    },
  }) as any;

const makeEmailJob = (overrides: Partial<ContactNotificationEmailJobData> = {}) =>
  ({
    name: 'contact-notification-email',
    data: {
      type: 'contact-notification-email' as const,
      transactionId: 'tx1',
      contactEmail: 'amina@example.com',
      contactFirstName: 'Amina',
      creatorDisplayName: 'Fawaz',
      amount: 5000,
      currency: 'NGN',
      ...overrides,
    },
  }) as any;

describe('NotificationsProcessor — contact notification handlers', () => {
  let processor: NotificationsProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        { provide: SmsOptOutService, useValue: mockSmsOptOutService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: EmailProvider, useValue: mockEmailProvider },
        { provide: SmsProvider, useValue: mockSmsProvider },
        { provide: TemplateService, useValue: mockTemplateService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    processor = module.get<NotificationsProcessor>(NotificationsProcessor);
    jest.clearAllMocks();
  });

  describe('contact-notification-sms', () => {
    it('sends SMS and increments usage when contact is not opted out', async () => {
      mockSmsOptOutService.isOptedOut.mockResolvedValue(false);
      mockSmsProvider.sendSms.mockResolvedValue(undefined);
      mockSubscriptionService.incrementFeatureUsage.mockResolvedValue(undefined);

      await processor.process(makeSmsJob());

      expect(mockSmsProvider.sendSms).toHaveBeenCalledWith({
        to: '+2348012345678',
        body: expect.stringContaining('5000 NGN'),
      });
      expect(mockSubscriptionService.incrementFeatureUsage).toHaveBeenCalledWith(
        'user1',
        'contactNotificationSms',
      );
    });

    it('skips SMS silently when contact is opted out', async () => {
      mockSmsOptOutService.isOptedOut.mockResolvedValue(true);

      await processor.process(makeSmsJob());

      expect(mockSmsProvider.sendSms).not.toHaveBeenCalled();
      expect(mockSubscriptionService.incrementFeatureUsage).not.toHaveBeenCalled();
    });

    it('uses "Someone" when contactFirstName is null', async () => {
      mockSmsOptOutService.isOptedOut.mockResolvedValue(false);
      mockSmsProvider.sendSms.mockResolvedValue(undefined);
      mockSubscriptionService.incrementFeatureUsage.mockResolvedValue(undefined);

      await processor.process(makeSmsJob({ contactFirstName: null }));

      expect(mockSmsProvider.sendSms).toHaveBeenCalledWith({
        to: '+2348012345678',
        body: expect.stringContaining('Someone'),
      });
    });

    it('does not increment usage when sendSms throws', async () => {
      mockSmsOptOutService.isOptedOut.mockResolvedValue(false);
      mockSmsProvider.sendSms.mockRejectedValue(new Error('Twilio error'));

      await expect(processor.process(makeSmsJob())).rejects.toThrow('Twilio error');
      expect(mockSubscriptionService.incrementFeatureUsage).not.toHaveBeenCalled();
    });
  });

  describe('contact-notification-email', () => {
    it('sends email via email provider', async () => {
      mockEmailProvider.sendEmail.mockResolvedValue(undefined);

      await processor.process(makeEmailJob());

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'amina@example.com' }),
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter api test -- --testPathPattern="notifications.processor" --no-coverage
```

Expected: FAIL — TypeError: Cannot read properties of undefined (the processor has not yet been updated to inject `SmsOptOutService` or `SubscriptionService`, so those fields are `undefined` at runtime).

- [ ] **Step 3: Update processor imports and constructor**

In `apps/api/src/modules/notifications/notifications.processor.ts`, update imports and constructor:

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';
import { TemplateService } from './template.service';
import { SmsOptOutService } from './services/sms-optout.service';
import { SubscriptionService } from '../subscription/subscription.service';
import type {
  EmailJobData,
  NotificationJobData,
  SmsJobData,
  ContactNotificationSmsJobData,
  ContactNotificationEmailJobData,
} from './interfaces/job-data.interface';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly templateService: TemplateService,
    private readonly configService: ConfigService,
    private readonly smsOptOutService: SmsOptOutService,
    private readonly subscriptionService: SubscriptionService,  // @Global() — no module import needed
  ) {
    super();
  }
  // ... existing methods unchanged
```

- [ ] **Step 4: Add the two new cases to the switch and their handlers**

In the `process()` method, add after the `'send-sms'` case:

```typescript
case 'contact-notification-sms':
  await this.handleContactNotificationSms(job.data as ContactNotificationSmsJobData);
  break;
case 'contact-notification-email':
  await this.handleContactNotificationEmail(job.data as ContactNotificationEmailJobData);
  break;
```

Then add the two private handler methods:

```typescript
private async handleContactNotificationSms(data: ContactNotificationSmsJobData): Promise<void> {
  const { contactPhoneNumber, contactFirstName, creatorDisplayName, amount, currency, creatorId } = data;

  const optedOut = await this.smsOptOutService.isOptedOut(contactPhoneNumber);
  if (optedOut) {
    this.logger.log(`Skipping SMS to ${contactPhoneNumber} — opted out`);
    return;
  }

  const name = contactFirstName ?? 'Someone';
  const body = `${name}, a transaction of ${amount} ${currency} has been recorded in your name by ${creatorDisplayName} on Wathīqah. View your record at wathiqah.akanors.com. Reply STOP to opt out.`;

  await this.smsProvider.sendSms({ to: contactPhoneNumber, body });
  await this.subscriptionService.incrementFeatureUsage(creatorId, 'contactNotificationSms');
  this.logger.log(`Contact notification SMS sent to ${contactPhoneNumber}`);
}

private async handleContactNotificationEmail(data: ContactNotificationEmailJobData): Promise<void> {
  const { contactEmail, contactFirstName, creatorDisplayName, amount, currency } = data;

  const name = contactFirstName ?? 'Someone';
  const subject = 'A transaction has been recorded in your name on Wathīqah';

  await this.handleSendEmail({
    to: contactEmail,
    subject,
    templateName: 'contact-transaction-notification',
    templateData: { name, creatorDisplayName, amount, currency, subject },
  });

  this.logger.log(`Contact notification email sent to ${contactEmail}`);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter api test -- --testPathPattern="notifications.processor" --no-coverage
```

Expected: PASS — all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/notifications/notifications.processor.ts apps/api/src/modules/notifications/notifications.processor.spec.ts
git commit -m "feat(notifications): add contact notification job handlers to processor"
```

---

## Task 8: NotificationsController — Twilio Opt-Out Webhook

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import * as twilio from 'twilio';
import { SmsOptOutService } from './services/sms-optout.service';
import { OptOutSource } from '../../generated/prisma/client';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly smsOptOutService: SmsOptOutService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Receives Twilio STOP reply webhooks and persists the opt-out.
   * This endpoint is intentionally public — HTTP controllers in this
   * project are unauthenticated by default (auth is GraphQL-only).
   * Security is provided by Twilio signature validation.
   */
  @Post('sms/optout')
  async handleSmsOptOut(@Req() req: Request, @Res() res: Response) {
    const authToken = this.configService.get<string>('twilio.authToken');
    const signature = req.headers['x-twilio-signature'] as string ?? '';
    const appUrl = this.configService.get<string>('app.url')?.replace(/\/$/, '');
    const webhookUrl = `${appUrl}/notifications/sms/optout`;

    const isValid = twilio.validateRequest(
      authToken,
      signature,
      webhookUrl,
      req.body as Record<string, string>,
    );

    if (!isValid) {
      this.logger.warn(`Invalid Twilio signature on opt-out webhook from ${req.ip}`);
      return res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
    }

    const phoneNumber = (req.body as Record<string, string>)?.From;
    if (phoneNumber) {
      await this.smsOptOutService.addOptOut(phoneNumber, OptOutSource.REPLY_STOP);
      this.logger.log(`SMS opt-out recorded for ${phoneNumber}`);
    }

    return res
      .status(HttpStatus.OK)
      .type('text/xml')
      .send('<Response></Response>');
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter api build 2>&1 | grep -E "error TS" | head -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/notifications/notifications.controller.ts
git commit -m "feat(notifications): add Twilio SMS opt-out webhook controller"
```

---

## Task 9: Module Wiring

**Files:**
- Modify: `apps/api/src/modules/notifications/notifications.module.ts`

- [ ] **Step 1: Update notifications.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsController } from './notifications.controller';
import { TemplateService } from './template.service';
import { SmsOptOutService } from './services/sms-optout.service';
import { MailtrapEmailProvider } from './providers/mailtrap-email.provider';
import { SendGridEmailProvider } from './providers/sendgrid-email.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    NotificationsProcessor,
    TemplateService,
    SmsOptOutService,
    {
      provide: EmailProvider,
      useFactory: (configService: ConfigService) => {
        const provider = (
          configService.get<string>('notifications.emailProvider') || 'mailtrap'
        ).toLowerCase();
        if (provider === 'sendgrid') {
          return new SendGridEmailProvider(configService);
        }
        return new MailtrapEmailProvider(configService);
      },
      inject: [ConfigService],
    },
    {
      provide: SmsProvider,
      useClass: TwilioSmsProvider,
    },
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
```

- [ ] **Step 2: Start the API and verify it boots without errors**

```bash
pnpm --filter api dev 2>&1 | head -30
```

Expected: NestJS bootstraps successfully; `NotificationsController` route registered at `POST /notifications/sms/optout`.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/notifications/notifications.module.ts
git commit -m "feat(notifications): wire SmsOptOutService and NotificationsController into module"
```

---

## Task 10: Transaction Entity — smsSkipped Field

**Files:**
- Modify: `apps/api/src/modules/transactions/entities/transaction.entity.ts`

- [ ] **Step 1: Add smsSkipped as a transient nullable GraphQL field**

Append to the `Transaction` class in `transaction.entity.ts` (after the `history` field):

```typescript
/**
 * Transient field — not stored in the database.
 * Set to true when the contact SMS could not be sent because the creator
 * has reached their free-tier contactNotificationSms limit for the month.
 */
@Field(() => Boolean, { nullable: true })
smsSkipped?: boolean;
```

- [ ] **Step 2: Verify schema generation**

```bash
pnpm --filter api build 2>&1 | grep -E "error TS" | head -10
```

Expected: No errors. The `smsSkipped` field will appear in the generated GraphQL schema.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/transactions/entities/transaction.entity.ts
git commit -m "feat(transactions): add transient smsSkipped field to Transaction entity"
```

---

## Task 11: TransactionsService — Trigger Contact Notification

**Files:**
- Modify: `apps/api/src/modules/transactions/transactions.service.ts`

- [ ] **Step 1: Verify the Contact model has phoneNumber, email, firstName**

```bash
grep -A 20 "model Contact" apps/api/prisma/schema.prisma
```

Expected: `phoneNumber`, `email`, and `firstName` fields present. If any are missing, note them — they are referenced in the contact query in the next step.

- [ ] **Step 2: Add the contact notification trigger to the create method**

In `TransactionsService.create()`, find the section after the `prisma.$transaction` block and before `return transaction`. Replace:

```typescript
  return transaction;
}
```

With:

```typescript
  // Contact notification — send SMS/email to the contact for qualifying transaction types
  let smsSkipped = false;
  const qualifyingTypes: TransactionType[] = [
    TransactionType.GIVEN,
    TransactionType.RECEIVED,
    TransactionType.RETURNED,
  ];

  if (transaction.contactId && qualifyingTypes.includes(transaction.type)) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: transaction.contactId },
      select: { phoneNumber: true, email: true, firstName: true },
    });

    if (contact && (contact.phoneNumber || contact.email)) {
      const creator = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, email: true },
      });
      const creatorDisplayName = creator?.firstName ?? creator?.email ?? 'Someone';

      const result = await this.notificationService
        .sendContactNotification({
          transactionId: transaction.id,
          contactPhoneNumber: contact.phoneNumber ?? null,
          contactEmail: contact.email ?? null,
          contactFirstName: contact.firstName ?? null,
          creatorId: userId,
          creatorDisplayName,
          amount: transaction.amount?.toNumber() ?? 0,
          currency: transaction.currency,
        })
        .catch((err) => {
          console.error('Failed to send contact notification:', err);
          return { smsSkipped: false };
        });

      smsSkipped = result.smsSkipped;
    }
  }

  return { ...transaction, smsSkipped };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter api build 2>&1 | grep -E "error TS" | head -10
```

Expected: No errors. If `contact.email` or `contact.firstName` cause TS errors, the Contact schema fields may need to be confirmed (see Step 1).

- [ ] **Step 4: Smoke test — create a transaction via the API and check logs**

Start the API (`pnpm --filter api dev`) and create a GIVEN transaction via GraphQL with a contact that has a phone number. Check the API logs for:
- `Contact notification SMS sent to +...` or
- `SMS not sent — opted out` or
- No log (if contact has no phone/email)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/transactions/transactions.service.ts
git commit -m "feat(transactions): trigger contact notification SMS and email on qualifying transaction creation"
```

---

## Task 12: Frontend — smsSkipped Toast

**Files:**
- Modify: `apps/web/src/lib/apollo/queries/transactions.ts`
- Modify: `apps/web/src/hooks/useTransactions.ts`
- Modify: `apps/web/src/routes/transactions/new.tsx`

- [ ] **Step 1: Add smsSkipped to the CREATE_TRANSACTION mutation**

In `apps/web/src/lib/apollo/queries/transactions.ts`, update `CREATE_TRANSACTION`:

```typescript
export const CREATE_TRANSACTION: TypedDocumentNode<
  CreateTransactionMutation,
  CreateTransactionMutationVariables
> = gql`
  mutation CreateTransaction($input: CreateTransactionInput!) {
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
  }
`;
```

- [ ] **Step 2: Regenerate GraphQL types**

```bash
pnpm --filter web codegen
```

Expected: `CreateTransactionMutation` type updated; `smsSkipped?: boolean | null` present in the transaction response type.

- [ ] **Step 3: Surface smsSkipped in useTransactions**

In `apps/web/src/hooks/useTransactions.ts`, update `createTransaction` to return the full mutation result:

The `createTransaction` function already returns the mutation result via `createTransactionMutation({ variables: { input } })`. The `data` returned includes `createTransaction.smsSkipped`. No change needed to the hook — callers can read it from the returned Apollo result directly.

- [ ] **Step 4: Add the upgrade toast in new.tsx**

In `apps/web/src/routes/transactions/new.tsx`, find the `createTransaction` call (around line 198-208):

```typescript
await createTransaction({
  // ... existing input
});

toast.success("Transaction created successfully");
```

Replace with:

```typescript
const result = await createTransaction({
  // ... existing input (unchanged)
});

if (result.data?.createTransaction?.smsSkipped) {
  toast.warning(
    "Transaction saved. SMS not sent — you've reached your 10 free contact notifications this month.",
    {
      action: {
        label: "Upgrade to Pro",
        onClick: () => {
          // Navigate to pricing page — update path once pricing route is confirmed
          window.location.href = "/pricing";
        },
      },
      duration: 8000,
    },
  );
} else {
  toast.success("Transaction created successfully");
}
```

- [ ] **Step 5: Apply the same toast pattern to items/new.tsx**

In `apps/web/src/routes/items/new.tsx`, the `handleSubmit` function at line 20 calls `createTransaction`. Apply the identical pattern:

```typescript
const handleSubmit = async (values: CreateTransactionInput) => {
  try {
    const result = await createTransaction(values);
    if (result.data?.createTransaction?.smsSkipped) {
      toast.warning(
        "Transaction saved. SMS not sent — you've reached your 10 free contact notifications this month.",
        {
          action: {
            label: "Upgrade to Pro",
            onClick: () => { window.location.href = "/pricing"; },
          },
          duration: 8000,
        },
      );
    } else {
      toast.success("Item transaction recorded successfully");
    }
    navigate({ to: "/items" });
  } catch (error) {
    console.error(error);
  }
};
```

- [ ] **Step 6: Verify frontend builds**

```bash
pnpm --filter web build 2>&1 | grep -E "error|Error" | head -20
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/apollo/queries/transactions.ts apps/web/src/hooks/useTransactions.ts apps/web/src/routes/transactions/new.tsx apps/web/src/routes/items/new.tsx
git commit -m "feat(web): show upgrade toast when contact SMS limit is reached"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run full backend test suite**

```bash
pnpm --filter api test --no-coverage
```

Expected: All tests pass; no regressions.

- [ ] **Step 2: Run full frontend test suite**

```bash
pnpm --filter web test
```

Expected: All tests pass.

- [ ] **Step 3: Run full build**

```bash
pnpm build
```

Expected: Both apps build cleanly.

- [ ] **Step 4: End-to-end smoke test checklist**

- [ ] Create a GIVEN transaction with a contact who has a phone number → check API logs for SMS job enqueue
- [ ] Create a GIVEN transaction with a contact who has an email → check logs for email job enqueue
- [ ] Create an INCOME transaction → verify no contact notification job is enqueued
- [ ] Mark a phone as opted out in `SmsOptOut` table directly → create a GIVEN transaction → verify SMS is skipped in logs
- [ ] As a FREE user, create 11 GIVEN transactions with phone contacts → verify the 11th returns `smsSkipped: true` and the toast appears in the frontend
- [ ] POST to `POST /notifications/sms/optout` with an invalid Twilio signature → verify 403 response
