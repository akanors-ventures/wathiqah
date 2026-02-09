import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';
import { AuthPayload } from './entities/auth-payload.entity';
import { ConfigService } from '@nestjs/config';
import * as ms from 'ms';
import { PrismaService } from '../../prisma/prisma.service';
import { AcceptInvitationInput } from './dto/accept-invitation.input';
import { hashToken } from '../../common/utils/crypto.utils';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { ChangePasswordInput } from './dto/change-password.input';
import { v4 as uuidv4 } from 'uuid';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { NotificationService } from '../notifications/notification.service';
import { splitName, normalizeEmail } from '../../common/utils/string.utils';
import { User } from 'src/generated/prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly notificationService: NotificationService,
  ) {}

  private async generateTokens(userId: string, email: string) {
    const accessExpiry = ms(
      this.configService.getOrThrow<string>(
        'auth.jwt.expiration',
      ) as ms.StringValue,
    );
    const refreshExpiry = ms(
      this.configService.getOrThrow<string>(
        'auth.jwt.refreshExpiration',
      ) as ms.StringValue,
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

  async signup(signupInput: SignupInput): Promise<User> {
    const email = normalizeEmail(signupInput.email);
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // If token provided, validate invitation
    let invitation;
    if (signupInput.token) {
      invitation = await this.prisma.contactInvitation.findUnique({
        where: { token: signupInput.token },
        include: { contact: true },
      });

      if (!invitation) {
        throw new BadRequestException('Invalid invitation token');
      }

      if (invitation.status !== 'PENDING') {
        throw new BadRequestException(
          'Invitation has already been used or cancelled',
        );
      }

      if (new Date() > invitation.expiresAt) {
        throw new BadRequestException('Invitation has expired');
      }

      // Optional: Verify email matches if invitation email exists
      if (
        invitation.contact.email &&
        normalizeEmail(invitation.contact.email) !== email
      ) {
        throw new BadRequestException(
          'Invitation was sent to a different email address',
        );
      }
    }

    const passwordHash = await bcrypt.hash(signupInput.password, 10);
    const { firstName, lastName } = splitName(signupInput.name);
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required');
    }

    const user = await this.prisma.$transaction(async (prisma) => {
      const newUser = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash,
        },
      });

      // If invitation exists, mark as accepted and link user
      if (invitation) {
        await prisma.contactInvitation.update({
          where: { id: invitation.id },
          data: {
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            invitedUserId: newUser.id,
          },
        });
      }

      // GLOBAL LINKING: Link ALL existing contact records with this email to the new user
      // This ensures that any user who had this person as a contact (even without an invite)
      // now has their record correctly linked for shared transaction visibility.
      await prisma.contact.updateMany({
        where: {
          email: email,
          linkedUserId: null, // Only link if not already linked
        },
        data: {
          linkedUserId: newUser.id,
        },
      });

      return newUser;
    });

    // Generate verification token
    const verificationToken = uuidv4();
    const verificationTokenHash = hashToken(verificationToken);

    // Store in Redis with expiration
    await this.cacheManager.set(
      `verify:${verificationTokenHash}`,
      user.id,
      ms(
        this.configService.getOrThrow<string>(
          'auth.inviteTokenExpiry',
        ) as ms.StringValue,
      ),
    );

    // Send verification email (Queue handled)
    this.notificationService
      .sendVerificationEmail(user.email, user.firstName, verificationToken)
      .catch((err) =>
        this.logger.error(
          `Failed to queue verification email for ${user.email}`,
          err,
        ),
      );
    return user;
  }

  async login(loginInput: LoginInput): Promise<AuthPayload> {
    const email = normalizeEmail(loginInput.email);
    const user = await this.usersService.findByEmail(email);
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

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Email not verified. Please check your inbox.',
      );
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
    );

    return {
      accessToken,
      refreshToken,
      user: this.usersService.toEntity(user),
    };
  }

  async verifyRefreshToken(refreshToken: string) {
    return this.jwtService.verifyAsync(refreshToken);
  }

  async refreshToken(refreshToken: string): Promise<AuthPayload> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
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
        user: this.usersService.toEntity(user),
      };
    } catch (error) {
      throw new UnauthorizedException(`Access Denied: ${error.message}`);
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
      user: this.usersService.toEntity(updatedUser),
    };
  }

  async forgotPassword(
    forgotPasswordInput: ForgotPasswordInput,
  ): Promise<boolean> {
    const email = normalizeEmail(forgotPasswordInput.email);
    const user = await this.usersService.findByEmail(email);
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
        ) as ms.StringValue,
      ),
    );

    this.notificationService
      .sendPasswordResetEmail(user.email, user.firstName, resetToken)
      .catch((err) =>
        this.logger.error(
          `Failed to queue password reset email for ${user.email}`,
          err,
        ),
      );

    return true;
  }

  async resendVerificationEmail(email: string): Promise<boolean> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.usersService.findByEmail(normalizedEmail);

    // Return true even if user not found to prevent enumeration
    if (!user) {
      return true;
    }

    // If user is already verified, we can just return true
    if (user.isEmailVerified) {
      return true;
    }

    // Generate verification token
    const verificationToken = uuidv4();
    const verificationTokenHash = hashToken(verificationToken);

    // Store in Redis with expiration
    await this.cacheManager.set(
      `verify:${verificationTokenHash}`,
      user.id,
      ms(
        this.configService.getOrThrow<string>(
          'auth.inviteTokenExpiry',
        ) as ms.StringValue,
      ),
    );

    this.notificationService
      .sendVerificationEmail(user.email, user.firstName, verificationToken)
      .catch((err) =>
        this.logger.error(
          `Failed to queue verification email for ${user.email}`,
          err,
        ),
      );

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

  async verifyEmail(token: string): Promise<AuthPayload> {
    const hashedToken = hashToken(token);
    const redisKey = `verify:${hashedToken}`;
    const verifiedKey = `verified:${hashedToken}`;

    const userId = await this.cacheManager.get<string>(redisKey);

    if (!userId) {
      const alreadyVerifiedUserId =
        await this.cacheManager.get<string>(verifiedKey);
      if (alreadyVerifiedUserId) {
        throw new ConflictException('Account already verified');
      }
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      // Clear verification token if it somehow still exists
      await this.cacheManager.del(redisKey);
      // Ensure we have the verified record
      await this.cacheManager.set(verifiedKey, user.id, ms('24h'));
      throw new ConflictException('Account already verified');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(
      user.id,
      user.email,
    );

    // Clear verification token
    await this.cacheManager.del(redisKey);

    // Store a temporary record that this token was used to verify an account
    // This allows us to show a better message if the user clicks the link again
    await this.cacheManager.set(verifiedKey, user.id, ms('24h'));

    // Update user status
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    // Link existing contacts
    await this.prisma.contact.updateMany({
      where: {
        email: user.email,
        linkedUserId: null,
      },
      data: {
        linkedUserId: user.id,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.usersService.toEntity({ ...user, isEmailVerified: true }),
    };
  }
}
