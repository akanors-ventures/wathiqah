import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../modules/notifications/notification.service';
import { GrantAccessInput } from './dto/grant-access.input';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SharedAccessService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async grantAccess(
    grantAccessInput: GrantAccessInput,
    granterId: string,
    granterName: string,
  ) {
    const email = grantAccessInput.email.toLowerCase();

    // Check if user is granting access to themselves
    const granter = await this.prisma.user.findUnique({
      where: { id: granterId },
    });

    if (granter && granter.email.toLowerCase() === email) {
      throw new BadRequestException('You cannot grant access to yourself');
    }

    // Check if access already granted
    const existingGrant = await this.prisma.accessGrant.findFirst({
      where: {
        granterId,
        email,
        status: { not: 'REVOKED' },
      },
    });

    if (existingGrant) {
      throw new BadRequestException(`Access already granted to ${email}`);
    }

    const token = uuidv4();

    const grant = await this.prisma.accessGrant.create({
      data: {
        email,
        granterId,
        token,
        status: 'PENDING',
      },
    });

    // Send notification
    await this.notificationService.sendSharedAccessInvite(
      email,
      granterName,
      token,
    );

    return grant;
  }

  async revokeAccess(id: string, granterId: string) {
    const grant = await this.prisma.accessGrant.findUnique({ where: { id } });
    if (!grant) {
      throw new NotFoundException('Access grant not found');
    }
    if (grant.granterId !== granterId) {
      throw new ForbiddenException(
        'You do not have permission to revoke this access',
      );
    }

    return this.prisma.accessGrant.update({
      where: { id },
      data: { status: 'REVOKED' },
    });
  }

  async findAll(granterId: string) {
    return this.prisma.accessGrant.findMany({
      where: { granterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findReceived(email: string) {
    return this.prisma.accessGrant.findMany({
      where: { email: email.toLowerCase(), status: { not: 'REVOKED' } },
      include: { granter: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptAccess(token: string, email: string) {
    const grant = await this.prisma.accessGrant.findUnique({
      where: { token },
    });

    if (!grant) {
      throw new NotFoundException('Invalid or expired invitation link');
    }

    if (grant.email.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenException(
        'This invitation was sent to a different email address',
      );
    }

    if (grant.status === 'REVOKED') {
      throw new BadRequestException('This invitation has been revoked');
    }

    return this.prisma.accessGrant.update({
      where: { id: grant.id },
      data: { status: 'ACCEPTED' },
      include: { granter: true },
    });
  }

  async getSharedData(grantId: string, viewerEmail: string) {
    const grant = await this.prisma.accessGrant.findUnique({
      where: { id: grantId },
      include: { granter: true },
    });

    if (!grant) {
      throw new NotFoundException('Access grant not found');
    }

    if (grant.email.toLowerCase() !== viewerEmail.toLowerCase()) {
      throw new ForbiddenException('You do not have access to this data');
    }

    if (grant.status !== 'ACCEPTED') {
      throw new ForbiddenException('You must accept the invitation first');
    }

    const [transactions, promises, projects] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { createdById: grant.granterId },
        include: {
          contact: true,
          witnesses: { include: { user: true } },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.promise.findMany({
        where: { userId: grant.granterId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.findMany({
        where: { userId: grant.granterId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      user: grant.granter,
      transactions,
      promises,
      projects,
    };
  }
}
