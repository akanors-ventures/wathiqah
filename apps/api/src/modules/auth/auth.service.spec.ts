import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
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
