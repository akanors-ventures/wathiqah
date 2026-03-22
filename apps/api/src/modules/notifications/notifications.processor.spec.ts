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
