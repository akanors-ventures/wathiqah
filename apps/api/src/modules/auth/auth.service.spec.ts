import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

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
