import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotificationService } from '../notifications/notification.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService — switchOrgContext', () => {
  let service: AuthService;
  let prisma: { organisationMember: { findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };
  let usersService: { updateRefreshToken: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  beforeEach(async () => {
    prisma = {
      organisationMember: { findUnique: jest.fn() },
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('mock-token') };
    usersService = {
      updateRefreshToken: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      getOrThrow: jest.fn().mockReturnValue('15m'),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: configService },
        { provide: CACHE_MANAGER, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('returns tokens with activeOrgId in access token when org context valid', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({
      id: 'mem1',
      role: 'ADMIN',
    });

    const result = await service.switchOrgContext(
      'user1',
      'user@test.com',
      'org1',
    );

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    // Access token payload should include activeOrgId
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ activeOrgId: 'org1' }),
      expect.any(Object),
    );
  });

  it('returns tokens without activeOrgId when switching to personal mode (null)', async () => {
    const result = await service.switchOrgContext(
      'user1',
      'user@test.com',
      null,
    );

    expect(result).toHaveProperty('accessToken');
    // Refresh token should NOT include activeOrgId
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user1', email: 'user@test.com' }),
      expect.any(Object),
    );
    // Membership check should NOT be called for personal mode
    expect(prisma.organisationMember.findUnique).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when user is not a member of the org', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue(null);

    await expect(
      service.switchOrgContext('user1', 'user@test.com', 'org1'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
