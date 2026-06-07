import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { AuthResolver } from './auth.resolver';
import { AuthPayload } from './entities/auth-payload.entity';
import { Response } from 'express';

type PrivateResolver = {
  setCookies: (res: Response, payload: AuthPayload) => void;
};

/**
 * Tests for AuthService generateTokens method ensuring JWT expiry values are passed as strings
 * and for AuthResolver cookie maxAge configuration.
 */

describe('AuthService — generateTokens', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const userId = 'user-abc';
  const email = 'test@example.com';

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed-token'),
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

    service = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
  });

  it('passes string expiry to jwtService.signAsync for access token', async () => {
    await (
      service as unknown as Record<
        string,
        (...args: unknown[]) => Promise<unknown>
      >
    ).generateTokens(userId, email);
    const [, accessOptions] = (jwtService.signAsync as jest.Mock).mock.calls[0];
    expect(typeof accessOptions.expiresIn).toBe('string');
    expect(accessOptions.expiresIn).toBe('15m');
  });

  it('passes string expiry to jwtService.signAsync for refresh token', async () => {
    await (
      service as unknown as Record<
        string,
        (...args: unknown[]) => Promise<unknown>
      >
    ).generateTokens(userId, email);
    const [, refreshOptions] = (jwtService.signAsync as jest.Mock).mock
      .calls[1];
    expect(typeof refreshOptions.expiresIn).toBe('string');
    expect(refreshOptions.expiresIn).toBe('7d');
  });
});

describe('AuthResolver — cookie maxAge from config', () => {
  let resolver: AuthResolver;
  let mockRes: Partial<Response>;
  let cookieCalls: Array<[string, string, object]>;

  beforeEach(async () => {
    cookieCalls = [];
    mockRes = {
      cookie: jest.fn((...args: [string, string, object]) => {
        cookieCalls.push(args);
        return mockRes as Response;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'auth.jwt.expiration': '15m',
                'auth.jwt.refreshExpiration': '7d',
              };
              return map[key];
            }),
            get: jest.fn(() => undefined),
          },
        },
        {
          provide: AuthService,
          useValue: {},
        },
      ],
    }).compile();

    resolver = moduleRef.get(AuthResolver);
  });

  it('sets accessToken cookie maxAge based on jwt expiration', () => {
    const payload = {
      accessToken: 'at',
      refreshToken: 'rt',
      user: null,
    } as unknown as AuthPayload;
    // @ts-expect-error access private method for testing
    (resolver as unknown as PrivateResolver).setCookies(
      mockRes as Response,
      payload,
    );
    const atCall = cookieCalls.find((c) => c[0] === 'accessToken');
    expect(atCall).toBeDefined();
    // 15 minutes -> 900000 ms
    expect((atCall![2] as { maxAge: number }).maxAge).toBe(15 * 60 * 1000);
  });

  it('sets refreshToken cookie maxAge based on jwt refresh expiration', () => {
    const payload = {
      accessToken: 'at',
      refreshToken: 'rt',
      user: null,
    } as unknown as AuthPayload;
    // @ts-expect-error access private method for testing
    (resolver as unknown as PrivateResolver).setCookies(
      mockRes as Response,
      payload,
    );
    const rtCall = cookieCalls.find((c) => c[0] === 'refreshToken');
    expect(rtCall).toBeDefined();
    // 7 days -> 604800000 ms
    expect((rtCall![2] as { maxAge: number }).maxAge).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });
});
