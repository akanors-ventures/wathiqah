import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsProcessor } from './notifications.processor';
import { SmsOptOutService } from './services/sms-optout.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EmailProvider } from './providers/email-provider.interface';
import { SmsProvider } from './providers/sms-provider.interface';
import { TemplateService } from './template.service';
import { ConfigService } from '@nestjs/config';
import type {
  ContactNotificationSmsJobData,
  ContactNotificationEmailJobData,
  NotificationJobData,
} from './interfaces/job-data.interface';
import type { Job } from 'bullmq';

const mockSmsOptOutService = { isOptedOut: jest.fn() };
const mockSubscriptionService = { incrementFeatureUsage: jest.fn() };
const mockSmsProvider = { sendSms: jest.fn() };
const mockEmailProvider = { sendEmail: jest.fn() };
const mockTemplateService = {
  render: jest.fn().mockReturnValue('<html>test</html>'),
};
const mockConfigService = {
  get: jest.fn().mockReturnValue('https://wathiqah.akanors.com'),
};

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
  }) as unknown as import('bullmq').Job;

const makeEmailJob = (
  overrides: Partial<ContactNotificationEmailJobData> = {},
) =>
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
  }) as unknown as import('bullmq').Job;

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
      mockSubscriptionService.incrementFeatureUsage.mockResolvedValue(
        undefined,
      );

      await processor.process(makeSmsJob());

      expect(mockSmsProvider.sendSms).toHaveBeenCalledWith({
        to: '+2348012345678',
        body: expect.stringContaining('₦5,000'),
      });
      expect(
        mockSubscriptionService.incrementFeatureUsage,
      ).toHaveBeenCalledWith('user1', 'contactNotificationSms');
    });

    it('skips SMS silently when contact is opted out', async () => {
      mockSmsOptOutService.isOptedOut.mockResolvedValue(true);

      await processor.process(makeSmsJob());

      expect(mockSmsProvider.sendSms).not.toHaveBeenCalled();
      expect(
        mockSubscriptionService.incrementFeatureUsage,
      ).not.toHaveBeenCalled();
    });

    it('uses "Someone" when contactFirstName is null', async () => {
      mockSmsOptOutService.isOptedOut.mockResolvedValue(false);
      mockSmsProvider.sendSms.mockResolvedValue(undefined);
      mockSubscriptionService.incrementFeatureUsage.mockResolvedValue(
        undefined,
      );

      await processor.process(makeSmsJob({ contactFirstName: null }));

      expect(mockSmsProvider.sendSms).toHaveBeenCalledWith({
        to: '+2348012345678',
        body: expect.stringContaining('Someone'),
      });
    });

    it('does not increment usage when sendSms throws', async () => {
      mockSmsOptOutService.isOptedOut.mockResolvedValue(false);
      mockSmsProvider.sendSms.mockRejectedValue(new Error('Twilio error'));

      await expect(processor.process(makeSmsJob())).rejects.toThrow(
        'Twilio error',
      );
      expect(
        mockSubscriptionService.incrementFeatureUsage,
      ).not.toHaveBeenCalled();
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

  describe('provisioning-notification handler', () => {
    it('sends provisioning-granted email with expiresAt formatted', async () => {
      const job = {
        name: 'provisioning-notification',
        data: {
          type: 'provisioning-notification',
          notificationType: 'granted',
          email: 'user@example.com',
          name: 'Amina',
          expiresAt: new Date('2027-01-01').toISOString(),
        },
      } as unknown as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user@example.com' }),
      );
    });

    it('sends provisioning-expired email with expiredAt formatted', async () => {
      const job = {
        name: 'provisioning-notification',
        data: {
          type: 'provisioning-notification',
          notificationType: 'expired',
          email: 'user@example.com',
          name: 'Amina',
          expiredAt: new Date('2026-01-01').toISOString(),
        },
      } as unknown as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user@example.com' }),
      );
    });
  });

  describe('role-change-notification handler', () => {
    it('sends admin-promotion email when notificationType is promoted', async () => {
      const job = {
        name: 'role-change-notification',
        data: {
          type: 'role-change-notification',
          notificationType: 'promoted',
          email: 'admin@example.com',
          name: 'Fawaz',
        },
      } as unknown as Job<NotificationJobData>;

      await processor.process(job);

      expect(mockEmailProvider.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'admin@example.com' }),
      );
    });
  });
});
