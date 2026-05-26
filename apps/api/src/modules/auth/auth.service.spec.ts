import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import type { Response } from 'express';

describe('AuthService — generateTokens', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const userId = 'user-abc';
  const email = 'test@example.com';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed-token'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'auth.jwt.expiration': '15m',
                'auth.jwt.refreshExpiration': '7d',
              };
              if (!(key in map))
                throw new Error(`Config key not mocked: ${key}`);
              return map[key];
            }),
          },
        },
        {
          provide: UsersService,
          useValue: {
            updateRefreshToken: jest.fn(),
            findOne: jest.fn(),
            toEntity: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: {} },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  it('passes string expiry to jwtService.signAsync for access token', async () => {
    const svc = service as unknown as {
      generateTokens: (
        userId: string,
        email: string,
      ) => Promise<{ accessToken: string; refreshToken: string }>;
    };
    await svc.generateTokens(userId, email);

    const [, accessOptions] = (jwtService.signAsync as jest.Mock).mock.calls[0];
    expect(typeof accessOptions.expiresIn).toBe('string');
    expect(accessOptions.expiresIn).toBe('15m');
  });

  it('passes string expiry to jwtService.signAsync for refresh token', async () => {
    const svc = service as unknown as {
      generateTokens: (
        userId: string,
        email: string,
      ) => Promise<{ accessToken: string; refreshToken: string }>;
    };
    await svc.generateTokens(userId, email);

    const [, refreshOptions] = (jwtService.signAsync as jest.Mock).mock
      .calls[1];
    expect(typeof refreshOptions.expiresIn).toBe('string');
    expect(refreshOptions.expiresIn).toBe('7d');
  });
});

describe('AuthService — verifyEmail', () => {
  let service: AuthService;
  let mockPrisma: {
    user: { update: jest.Mock };
    contact: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let mockCache: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let mockUsersService: {
    findOne: jest.Mock;
    updateRefreshToken: jest.Mock;
    toEntity: jest.Mock;
  };
  let mockJwt: { signAsync: jest.Mock };

  const userId = 'user-123';
  const token = 'raw-token';
  const user = {
    id: userId,
    email: 'a@b.com',
    firstName: 'Alice',
    isEmailVerified: false,
    refreshTokenHash: null,
    passwordHash: 'hash',
  };

  beforeEach(async () => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    mockPrisma = {
      user: {
        update: jest.fn().mockResolvedValue({ ...user, isEmailVerified: true }),
      },
      contact: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn(
        (cb: (prisma: typeof mockPrisma) => Promise<void>) => cb(mockPrisma),
      ),
    };
    mockUsersService = {
      findOne: jest.fn().mockResolvedValue(user),
      updateRefreshToken: jest.fn(),
      toEntity: jest.fn((u: unknown) => u),
    };
    mockJwt = {
      signAsync: jest.fn().mockResolvedValue('tok'),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwt },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'auth.jwt.expiration': '15m',
                'auth.jwt.refreshExpiration': '7d',
              };
              if (!(key in map))
                throw new Error(`Config key not mocked: ${key}`);
              return map[key];
            }),
          },
        },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('commits DB writes before issuing tokens', async () => {
    // verifyEmail uses hashToken() internally — mock Redis to return userId
    // regardless of what key is used (the first get call is for verify: key)
    mockCache.get
      .mockResolvedValueOnce(userId) // verify:{hash} → userId
      .mockResolvedValueOnce(null); // verified:{hash} → null (not yet verified)

    const callOrder: string[] = [];
    mockPrisma.user.update.mockImplementation(() => {
      callOrder.push('user.update');
      return Promise.resolve({ ...user, isEmailVerified: true });
    });
    mockPrisma.contact.updateMany.mockImplementation(() => {
      callOrder.push('contact.updateMany');
      return Promise.resolve({ count: 0 });
    });
    mockJwt.signAsync.mockImplementation(() => {
      callOrder.push('signAsync');
      return Promise.resolve('tok');
    });

    await service.verifyEmail(token);

    const updateIdx = callOrder.indexOf('user.update');
    const contactIdx = callOrder.indexOf('contact.updateMany');
    const signIdx = callOrder.indexOf('signAsync');

    expect(updateIdx).toBeGreaterThanOrEqual(0);
    expect(contactIdx).toBeGreaterThanOrEqual(0);
    expect(signIdx).toBeGreaterThanOrEqual(0);
    expect(updateIdx).toBeLessThan(signIdx);
    expect(contactIdx).toBeLessThan(signIdx);
  });
});

// --- auth.resolver cookie maxAge ---

describe('AuthResolver — setCookies maxAge from config', () => {
  let resolver: AuthResolver;
  let cookieCallArgs: Array<[string, string, Record<string, unknown>]>;

  beforeEach(async () => {
    cookieCallArgs = [];
    const mockRes = {
      cookie: jest.fn((...args: [string, string, Record<string, unknown>]) => {
        cookieCallArgs.push(args);
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthResolver,
        { provide: AuthService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
            getOrThrow: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'auth.jwt.expiration': '15m',
                'auth.jwt.refreshExpiration': '7d',
              };
              if (!(key in map))
                throw new Error(`Config key not mocked: ${key}`);
              return map[key];
            }),
          },
        },
      ],
    }).compile();

    resolver = module.get(AuthResolver);
    const payload = {
      accessToken: 'at',
      refreshToken: 'rt',
      user: null as unknown as import('../users/entities/user.entity').User,
    };
    (
      resolver as unknown as {
        setCookies: (res: Response, p: typeof payload) => void;
      }
    ).setCookies(mockRes as unknown as Response, payload);
  });

  it('sets accessToken cookie maxAge to ms of jwt.expiration', () => {
    const atCall = cookieCallArgs.find(([name]) => name === 'accessToken');
    expect(atCall).toBeDefined();
    expect((atCall![2] as Record<string, unknown>).maxAge).toBe(15 * 60 * 1000);
  });

  it('sets refreshToken cookie maxAge to ms of jwt.refreshExpiration', () => {
    const rtCall = cookieCallArgs.find(([name]) => name === 'refreshToken');
    expect(rtCall).toBeDefined();
    expect((rtCall![2] as Record<string, unknown>).maxAge).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });
});

describe('AuthService — changePassword', () => {
  let service: AuthService;
  let mockUsersService: {
    findOne: jest.Mock;
    updatePassword: jest.Mock;
    updateRefreshToken: jest.Mock;
    toEntity: jest.Mock;
  };

  const userId = 'user-xyz';
  const mockUser = {
    id: userId,
    email: 'x@y.com',
    passwordHash: 'existing-hash',
  };

  beforeEach(async () => {
    mockUsersService = {
      findOne: jest.fn().mockResolvedValue(mockUser),
      updatePassword: jest.fn().mockResolvedValue(mockUser),
      updateRefreshToken: jest.fn().mockResolvedValue(undefined),
      toEntity: jest.fn((u: unknown) => u),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('tok') },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'auth.jwt.expiration': '15m',
                'auth.jwt.refreshExpiration': '7d',
              };
              if (!(key in map))
                throw new Error(`Config key not mocked: ${key}`);
              return map[key];
            }),
          },
        },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: {} },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('clears the refresh token after password update', async () => {
    jest
      .spyOn(bcrypt, 'compare')
      .mockResolvedValueOnce(true as unknown as never);
    jest.spyOn(bcrypt, 'hash').mockResolvedValueOnce('new-hash' as never);

    await service.changePassword(userId, {
      currentPassword: 'oldpass',
      newPassword: 'newpass123',
    });

    expect(mockUsersService.updateRefreshToken).toHaveBeenCalledWith(
      userId,
      null,
    );
  });
});
