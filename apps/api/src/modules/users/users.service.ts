import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeEmail } from '../../common/utils/string.utils';
import { Prisma } from '../../generated/prisma/client';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput) {
    const createData = { ...data };
    if (createData.email) {
      createData.email = normalizeEmail(createData.email);
    }
    return this.prisma.user.create({
      data: createData,
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: normalizeEmail(email) },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    const updateData = { ...data };
    if (typeof updateData.email === 'string') {
      updateData.email = normalizeEmail(updateData.email);
    }
    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  updateRefreshToken(userId: string, refreshTokenHash: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async searchWitness(query: string, type: 'EMAIL' | 'PHONE') {
    // 1. Privacy: Enforce exact match logic (no 'contains' or partial search)
    // 2. Security: Only return necessary fields

    let user = null;

    if (type === 'EMAIL') {
      user = await this.prisma.user.findUnique({
        where: { email: normalizeEmail(query) },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isEmailVerified: true, // Only allow verified users? Optional but good practice.
        },
      });
    } else if (type === 'PHONE') {
      // Phone numbers might need normalization (e.g. +123 vs 123)
      // For now, assuming exact string match as stored in DB
      user = await this.prisma.user.findFirst({
        where: { phoneNumber: query },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isEmailVerified: true,
        },
      });
    }

    if (!user) {
      return null;
    }

    // 3. Privacy: Mask the name to prevent full PII revelation on guessed emails
    // E.g. "John Doe" -> "J*** D***"
    return {
      id: user.id,
      firstName: this.maskString(user.firstName),
      lastName: this.maskString(user.lastName),
    };
  }

  toEntity(prismaUser: Prisma.UserGetPayload<Record<string, never>>): User {
    if (!prismaUser) return null;

    // Convert featureUsage from JsonValue to Record<string, unknown>
    const user = { ...prismaUser } as unknown as User;
    if (
      user.featureUsage &&
      typeof user.featureUsage === 'object' &&
      !Array.isArray(user.featureUsage)
    ) {
      user.featureUsage = user.featureUsage as Record<string, unknown>;
    } else if (user.featureUsage === null || user.featureUsage === undefined) {
      user.featureUsage = null;
    }

    return user;
  }

  private maskString(str: string): string {
    if (!str || str.length === 0) return '';
    if (str.length === 1) return str + '***';
    return str[0] + '***';
  }
}
