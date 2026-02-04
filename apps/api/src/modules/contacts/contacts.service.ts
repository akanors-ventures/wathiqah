import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactInput } from './dto/create-contact.input';
import { UpdateContactInput } from './dto/update-contact.input';
import { splitName } from '../../common/utils/string.utils';
import { NotificationService } from '../notifications/notification.service';
import { v4 as uuidv4 } from 'uuid';
import { InvitationStatus } from '../../generated/prisma/client';

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(createContactInput: CreateContactInput, userId: string) {
    const { name, email, ...rest } = createContactInput;
    const { firstName, lastName } = splitName(name);

    let linkedUserId: string | undefined;

    if (email) {
      const registeredUser = await this.prisma.user.findUnique({
        where: { email },
      });
      if (registeredUser) {
        linkedUserId = registeredUser.id;
      }
    }

    return this.prisma.contact.create({
      data: {
        ...rest,
        email,
        firstName,
        lastName,
        userId,
        linkedUserId,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.contact.findMany({
      where: { userId },
      include: {
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        transactions: true,
        user: true,
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    if (contact.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this contact',
      );
    }

    return contact;
  }

  async update(
    id: string,
    updateContactInput: UpdateContactInput,
    userId: string,
  ) {
    // Check existence and ownership
    await this.findOne(id, userId);

    const { name, email, phoneNumber } = updateContactInput;
    let nameData = {};
    if (name) {
      const { firstName, lastName } = splitName(name);
      nameData = { firstName, lastName };
    }

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...nameData,
        ...(email !== undefined && { email }),
        ...(phoneNumber !== undefined && { phoneNumber }),
      },
    });
  }

  async remove(id: string, userId: string) {
    // Check existence and ownership
    await this.findOne(id, userId);

    return this.prisma.contact.delete({
      where: { id },
    });
  }

  async getBalance(contactId: string): Promise<number> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        contactId,
        category: 'FUNDS',
      },
      select: {
        id: true,
        type: true,
        amount: true,
        returnDirection: true,
        parentId: true,
        conversions: {
          where: {
            type: 'GIFT',
          },
          select: {
            amount: true,
          },
        },
      },
    });

    let balance = 0;
    for (const tx of transactions) {
      // If this is a GIFT transaction that has a parent, it's a conversion.
      // The parent transaction's amount will be adjusted by the GIFT amount.
      if (tx.type === 'GIFT' && tx.parentId) {
        continue; // Skip GIFT conversions, they are handled by adjusting the parent
      }

      let amount = tx.amount ? Number(tx.amount) : 0;

      // Subtract any GIFT conversions from the original transaction amount
      if (tx.conversions && tx.conversions.length > 0) {
        const totalGifted = tx.conversions.reduce(
          (sum, conv) => sum + (conv.amount ? Number(conv.amount) : 0),
          0,
        );
        amount = Math.max(0, amount - totalGifted);
      }

      if (tx.type === 'GIVEN') balance += amount;
      else if (tx.type === 'RECEIVED') balance -= amount;
      else if (tx.type === 'RETURNED') {
        if (tx.returnDirection === 'TO_ME') balance -= amount;
        else if (tx.returnDirection === 'TO_CONTACT') balance += amount;
      }
      // standalone GIFT (no parent) does not affect debt; ignored for balance
    }

    return balance;
  }

  async checkContactOnPlatform(id: string, userId: string) {
    const contact = await this.findOne(id, userId);

    if (!contact.email) {
      return {
        isRegistered: false,
        hasPendingInvitation: false,
      };
    }

    const registeredUser = await this.prisma.user.findUnique({
      where: { email: contact.email },
    });

    const pendingInvitation = await this.prisma.contactInvitation.findFirst({
      where: {
        contactId: id,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    return {
      isRegistered: !!registeredUser,
      hasPendingInvitation: !!pendingInvitation,
      registeredUser,
    };
  }

  async inviteContactToPlatform(id: string, userId: string) {
    const contact = await this.findOne(id, userId);

    if (!contact.email) {
      throw new BadRequestException(
        'Contact must have an email address to be invited',
      );
    }

    const status = await this.checkContactOnPlatform(id, userId);
    if (status.isRegistered) {
      throw new BadRequestException(
        'Contact is already registered on the platform',
      );
    }

    // Generate token and expiry (7 days)
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create or update invitation
    const invitation = await this.prisma.contactInvitation.upsert({
      where: { token }, // This is a bit weird for upsert but token is unique
      create: {
        token,
        expiresAt,
        contactId: id,
        inviterId: userId,
        status: InvitationStatus.PENDING,
      },
      update: {
        token,
        expiresAt,
        status: InvitationStatus.PENDING,
      },
    });

    // Send email
    await this.notificationService.sendContactInvitationEmail(
      contact.email,
      contact.firstName,
      `${contact.user.firstName} ${contact.user.lastName}`,
      token,
    );

    return {
      success: true,
      message: 'Invitation sent successfully',
      invitation,
    };
  }

  async linkContactsForUser(userId: string, email: string) {
    return this.prisma.contact.updateMany({
      where: {
        email,
        linkedUserId: null,
      },
      data: {
        linkedUserId: userId,
      },
    });
  }
}
