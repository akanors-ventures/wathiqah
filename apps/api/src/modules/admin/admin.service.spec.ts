import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service';
import { ConfigService } from '@nestjs/config';
import {
  AdminAction,
  SubscriptionTier,
  UserRole,
  NotificationType,
} from '../../generated/prisma/client';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    upsert: jest.fn(),
    findFirstOrThrow: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  adminAuditLog: {
    create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

const mockNotificationService = {
  sendProvisioningNotification: jest.fn(),
  sendRoleChangeNotification: jest.fn(),
};

const mockInAppNotificationsService = {
  create: jest.fn().mockResolvedValue({}),
  createSafely: jest.fn().mockResolvedValue(undefined),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'admin.email') return 'admin@example.com';
    if (key === 'admin.password') return 'secret123';
    if (key === 'admin.name') return 'Super Admin';
    return undefined;
  }),
};

// bcrypt is mocked so we can control compare results in tests
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-secret'),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: InAppNotificationsService,
          useValue: mockInAppNotificationsService,
        },
      ],
    }).compile();

    service = module.get(AdminService);
    jest.clearAllMocks();
  });

  describe('bootstrapSuperAdmin', () => {
    it('skips when env vars are not set', async () => {
      // Use Once so the override does not bleed into subsequent tests
      mockConfigService.get.mockReturnValueOnce(undefined);
      await service.bootstrapSuperAdmin();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('creates a super admin on fresh install (no existing user, no existing SUPER_ADMIN)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});

      await service.bootstrapSuperAdmin();

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'admin@example.com',
          role: UserRole.SUPER_ADMIN,
          isEmailVerified: true,
        }),
      });
    });

    it('verifies password and skips when SUPER_ADMIN already exists with matching credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'sa-1',
        email: 'admin@example.com',
        role: UserRole.SUPER_ADMIN,
        passwordHash: 'hashed-secret',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.bootstrapSuperAdmin();

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('throws on startup when SUPER_ADMIN password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'sa-1',
        email: 'admin@example.com',
        role: UserRole.SUPER_ADMIN,
        passwordHash: 'old-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.bootstrapSuperAdmin()).rejects.toThrow(
        'ADMIN_PASSWORD does not match',
      );
    });

    it('throws when ADMIN_EMAIL does not exist but a different SUPER_ADMIN does', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'sa-other',
        email: 'other-admin@example.com',
        role: UserRole.SUPER_ADMIN,
      });

      await expect(service.bootstrapSuperAdmin()).rejects.toThrow(
        'a super admin already exists',
      );
    });

    it('promotes an existing USER to SUPER_ADMIN when password matches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        role: UserRole.USER,
        passwordHash: 'hashed-secret',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({});

      await service.bootstrapSuperAdmin();

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
        data: { role: UserRole.SUPER_ADMIN },
      });
    });

    it('throws when promoting an existing user whose password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        role: UserRole.USER,
        passwordHash: 'wrong-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.bootstrapSuperAdmin()).rejects.toThrow(
        'ADMIN_PASSWORD does not match',
      );
    });

    it('throws when existing user has no password hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'admin@example.com',
        role: UserRole.USER,
        passwordHash: null,
      });
      // compare will not even be called — hash is null → passwordMatches = false

      await expect(service.bootstrapSuperAdmin()).rejects.toThrow(
        'ADMIN_PASSWORD does not match',
      );
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
      expect(mockInAppNotificationsService.createSafely).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.PROVISIONING_GRANTED,
        }),
        expect.any(String),
      );
    });

    it('writes a PROVISION_PRO audit log entry', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Amina',
      });
      mockPrisma.subscription.upsert.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockNotificationService.sendProvisioningNotification.mockResolvedValue(
        undefined,
      );

      const expiresAt = new Date('2027-01-01');
      await service.provisionPro('admin-1', 'user-1', expiresAt);

      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'admin-1',
          action: AdminAction.PROVISION_PRO,
          targetUserId: 'user-1',
          metadata: { expiresAt: expiresAt.toISOString() },
        },
      });
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

      await service.deprovisionPro('admin-1', 'user-1');

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
      expect(mockInAppNotificationsService.createSafely).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.PROVISIONING_REVOKED,
        }),
        expect.any(String),
      );
    });

    it('writes a DEPROVISION_PRO audit log entry', async () => {
      mockPrisma.subscription.findFirstOrThrow.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        user: { email: 'user@example.com', firstName: 'Amina' },
      });
      mockPrisma.subscription.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'user-1' });
      mockNotificationService.sendProvisioningNotification.mockResolvedValue(
        undefined,
      );

      await service.deprovisionPro('admin-1', 'user-1');

      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'admin-1',
          action: AdminAction.DEPROVISION_PRO,
          targetUserId: 'user-1',
        },
      });
    });
  });

  describe('setUserRole', () => {
    it('throws ForbiddenException when trying to assign SUPER_ADMIN role', async () => {
      await expect(
        service.setUserRole('sa-1', 'user-1', UserRole.SUPER_ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

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

      await service.setUserRole('sa-1', 'user-1', UserRole.ADMIN);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: UserRole.ADMIN } }),
      );
      expect(
        mockNotificationService.sendRoleChangeNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ notificationType: 'promoted' }),
      );
      expect(mockInAppNotificationsService.createSafely).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.ROLE_PROMOTED,
        }),
        expect.any(String),
      );
      expect(mockPrisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'sa-1',
          action: AdminAction.SET_USER_ROLE,
          targetUserId: 'user-1',
          metadata: { role: UserRole.ADMIN, previousRole: UserRole.USER },
        },
      });
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

      await service.setUserRole('sa-1', 'user-1', UserRole.USER);

      expect(
        mockNotificationService.sendRoleChangeNotification,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ notificationType: 'demoted' }),
      );
      expect(mockInAppNotificationsService.createSafely).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.ROLE_DEMOTED,
        }),
        expect.any(String),
      );
    });
  });

  describe('getUsers', () => {
    it('returns paginated users with total, page and limit', async () => {
      const users = [{ id: 'u1' }, { id: 'u2' }];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(42);

      const result = await service.getUsers({ page: 2, limit: 20 });

      expect(result).toEqual({ items: users, total: 42, page: 2, limit: 20 });
      // page 2 @ limit 20 => skip 20
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('builds a case-insensitive OR search across email and name', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({ search: 'amina' });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { email: { contains: 'amina', mode: 'insensitive' } },
              { firstName: { contains: 'amina', mode: 'insensitive' } },
              { lastName: { contains: 'amina', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('applies role and tier filters when provided', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({
        role: UserRole.ADMIN,
        tier: SubscriptionTier.PRO,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: UserRole.ADMIN, tier: SubscriptionTier.PRO },
        }),
      );
    });
  });

  describe('getUserById', () => {
    it('returns the user via findUniqueOrThrow', async () => {
      const user = { id: 'user-1', email: 'user@example.com' };
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(user);

      const result = await service.getUserById('user-1');

      expect(result).toBe(user);
      expect(mockPrisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  describe('getStats', () => {
    it('aggregates platform counts', async () => {
      // Order matches the $transaction array in getStats
      mockPrisma.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(70) // freeUsers
        .mockResolvedValueOnce(30) // proUsers
        .mockResolvedValueOnce(5) // adminUsers
        .mockResolvedValueOnce(12); // newUsersLast30Days
      mockPrisma.subscription.count
        .mockResolvedValueOnce(8) // provisionedProUsers
        .mockResolvedValueOnce(25); // activeSubscriptions

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalUsers: 100,
        freeUsers: 70,
        proUsers: 30,
        provisionedProUsers: 8,
        adminUsers: 5,
        newUsersLast30Days: 12,
        activeSubscriptions: 25,
      });
    });
  });

  describe('getAuditLogs', () => {
    it('returns paginated logs with actor and target included, newest first', async () => {
      const logs = [{ id: 'a1' }];
      mockPrisma.adminAuditLog.findMany.mockResolvedValue(logs);
      mockPrisma.adminAuditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLogs({
        action: AdminAction.PROVISION_PRO,
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({ items: logs, total: 1, page: 1, limit: 20 });
      expect(mockPrisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: AdminAction.PROVISION_PRO },
          include: { actor: true, targetUser: true },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });
});
