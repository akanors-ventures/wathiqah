import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';
import { AuthPayload } from './entities/auth-payload.entity';
import { ConfigService } from '@nestjs/config';
import ms, { type StringValue } from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { AcceptInvitationInput } from './dto/accept-invitation.input';
import { hashToken } from '../../common/utils/crypto.utils';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { ChangePasswordInput } from './dto/change-password.input';
import { v4 as uuidv4 } from 'uuid';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async generateTokens(userId: string, email: string) {
    const accessExpiry = ms(
      this.configService.getOrThrow<string>(
        'auth.jwt.expiration',
      ) as StringValue,
    );
    const refreshExpiry = ms(
      this.configService.getOrThrow<string>(
        'auth.jwt.refreshExpiration',
      ) as StringValue,
    );

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        expiresIn: accessExpiry,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        expiresIn: refreshExpiry,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(userId, refreshTokenHash);

    return { accessToken, refreshToken };
  }

  async signup(signupInput: SignupInput): Promise<AuthPayload> {
    const existingUser = await this.usersService.findByEmail(signupInput.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(signupInput.password, 10);
    const user = await this.usersService.create({
      email: signupInput.email,
      name: signupInput.name,
      passwordHash,
    });

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async login(loginInput: LoginInput): Promise<AuthPayload> {
    const user = await this.usersService.findByEmail(loginInput.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginInput.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
    );

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthPayload> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const userId = payload.sub;

      const user = await this.usersService.findOne(userId);
      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Access Denied');
      }

      const refreshTokenMatches = await bcrypt.compare(
        refreshToken,
        user.refreshTokenHash,
      );
      if (!refreshTokenMatches) {
        throw new UnauthorizedException('Access Denied');
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(user.id, user.email);

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user,
      };
    } catch (error) {
      throw new UnauthorizedException('Access Denied: ', error.message);
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async validateUser(userId: string) {
    return this.usersService.findOne(userId);
  }

  async getWitnessInvitation(token: string) {
    const hashedToken = hashToken(token);
    const redisKey = `invite:${hashedToken}`;

    const witnessId = await this.cacheManager.get<string>(redisKey);

    if (!witnessId) {
      throw new NotFoundException('Invalid or expired invitation token');
    }

    const witness = await this.prisma.witness.findUnique({
      where: { id: witnessId },
      include: {
        user: true,
        transaction: {
          include: {
            createdBy: true,
          },
        },
      },
    });

    if (!witness) {
      throw new NotFoundException('Witness record not found');
    }

    return witness;
  }

  async acceptInvitation(
    acceptInvitationInput: AcceptInvitationInput,
  ): Promise<AuthPayload> {
    const { token, password } = acceptInvitationInput;

    // 1. Hash the incoming raw token for key lookup
    // Redis key: `invite:{hashedToken}` -> `witnessId`
    const hashedToken = hashToken(token);
    const redisKey = `invite:${hashedToken}`;

    const witnessId = await this.cacheManager.get<string>(redisKey);

    if (!witnessId) {
      throw new NotFoundException('Invalid or expired invitation token');
    }

    // 2. Find witness record by ID (not token anymore)
    const witness = await this.prisma.witness.findUnique({
      where: { id: witnessId },
      include: { user: true },
    });

    if (!witness) {
      throw new NotFoundException('Witness record not found');
    }

    // Update Witness Status to ACKNOWLEDGED
    await this.prisma.witness.update({
      where: { id: witnessId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });

    // 3. Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Update user with password
    const updatedUser = await this.usersService.updatePassword(
      witness.userId,
      passwordHash,
    );

    // 5. Clear the invite token from Redis (Single-Use)
    await this.cacheManager.del(redisKey);

    // 6. Generate tokens and login
    const { accessToken, refreshToken } = await this.generateTokens(
      updatedUser.id,
      updatedUser.email,
    );

    return {
      accessToken,
      refreshToken,
      user: updatedUser,
    };
  }

  async forgotPassword(
    forgotPasswordInput: ForgotPasswordInput,
  ): Promise<boolean> {
    const user = await this.usersService.findByEmail(forgotPasswordInput.email);
    if (!user) {
      return true;
    }

    const resetToken = uuidv4();
    const resetTokenHash = hashToken(resetToken);

    // Key: `reset:{hashedToken}` -> `userId`
    // TTL: 1 hour (3600000 ms) by default
    await this.cacheManager.set(
      `reset:${resetTokenHash}`,
      user.id,
      ms(
        this.configService.getOrThrow<string>(
          'auth.resetPasswordTokenExpiry',
        ) as StringValue,
      ),
    );

    // TODO: Send email with resetToken
    // console.log(`Reset Token for ${user.email}: ${resetToken}`);

    return true;
  }

  async resetPassword(
    resetPasswordInput: ResetPasswordInput,
  ): Promise<boolean> {
    const { token, newPassword } = resetPasswordInput;
    const resetTokenHash = hashToken(token);
    const redisKey = `reset:${resetTokenHash}`;

    const userId = await this.cacheManager.get<string>(redisKey);

    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.usersService.updatePassword(userId, passwordHash);

    // Invalidate token
    await this.cacheManager.del(redisKey);

    return true;
  }

  async changePassword(
    userId: string,
    changePasswordInput: ChangePasswordInput,
  ): Promise<boolean> {
    const { currentPassword, newPassword } = changePasswordInput;
    const user = await this.usersService.findOne(userId);

    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.usersService.updatePassword(userId, passwordHash);

    return true;
  }
}
