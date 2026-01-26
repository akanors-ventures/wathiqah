import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.user.create({
      data,
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data,
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
        where: { email: query },
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

  private maskString(str: string): string {
    if (!str || str.length === 0) return '';
    if (str.length === 1) return str + '***';
    return str[0] + '***';
  }
}
