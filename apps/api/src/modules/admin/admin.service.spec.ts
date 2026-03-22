import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionTier, UserRole } from '../../generated/prisma/client';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    upsert: jest.fn(),
    findFirstOrThrow: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

const mockNotificationService = {
  sendProvisioningNotification: jest.fn(),
  sendRoleChangeNotification: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'admin.email') return 'admin@example.com';
    if (key === 'admin.password') return 'secret123';
    if (key === 'admin.name') return 'Super Admin';
    return undefined;
  }),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(AdminService);
    jest.clearAllMocks();
  });

  describe('bootstrapSuperAdmin', () => {
    it('creates a super admin when none exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue({});

      await service.bootstrapSuperAdmin();

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'admin@example.com' },
          create: expect.objectContaining({
            role: UserRole.ADMIN,
            isEmailVerified: true,
          }),
        }),
      );
    });

    it('skips when an admin already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing-admin' });

      await service.bootstrapSuperAdmin();

      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('skips when env vars are not set', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      await service.bootstrapSuperAdmin();
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('provisionPro', () => {
    it('upserts subscription and upgrades user tier', async () => {
      const user = {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Amina',
      };
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      mockPrisma.subscription.upsert.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockNotificationService.sendProvisioningNotification.mockResolvedValue(
        undefined,
      );

      const expiresAt = new Date('2027-01-01');
      await service.provisionPro('admin-1', 'user-1', expiresAt);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({
            tier: SubscriptionTier.PRO,
            isProvisioned: true,
            provider: 'ADMIN',
            provisionedById: 'admin-1',
          }),
        }),
      );
      expect(
        mockNotificationService.sendProvisioningNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ notificationType: 'granted' }),
      );
    });
  });

  describe('deprovisionPro', () => {
    it('downgrades subscription and sends revoked notification', async () => {
      const sub = {
        id: 'sub-1',
        userId: 'user-1',
        user: { email: 'user@example.com', firstName: 'Amina' },
      };
      mockPrisma.subscription.findFirstOrThrow.mockResolvedValue(sub);
      mockPrisma.subscription.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'user-1' });
      mockNotificationService.sendProvisioningNotification.mockResolvedValue(
        undefined,
      );

      await service.deprovisionPro('user-1');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tier: SubscriptionTier.FREE,
            isProvisioned: false,
          }),
        }),
      );
      expect(
        mockNotificationService.sendProvisioningNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ notificationType: 'revoked' }),
      );
    });
  });

  describe('setUserRole', () => {
    it('updates role and sends promotion notification for ADMIN', async () => {
      const user = {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Amina',
        role: UserRole.USER,
      };
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        role: UserRole.ADMIN,
      });
      mockNotificationService.sendRoleChangeNotification.mockResolvedValue(
        undefined,
      );

      await service.setUserRole('admin-1', 'user-1', UserRole.ADMIN);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: UserRole.ADMIN } }),
      );
      expect(
        mockNotificationService.sendRoleChangeNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ notificationType: 'promoted' }),
      );
    });

    it('sends demotion notification when role is set to USER', async () => {
      const user = {
        id: 'user-1',
        email: 'admin@example.com',
        firstName: 'Fawaz',
        role: UserRole.ADMIN,
      };
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        role: UserRole.USER,
      });
      mockNotificationService.sendRoleChangeNotification.mockResolvedValue(
        undefined,
      );

      await service.setUserRole('super-admin', 'user-1', UserRole.USER);

      expect(
        mockNotificationService.sendRoleChangeNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ notificationType: 'demoted' }),
      );
    });
  });
});
