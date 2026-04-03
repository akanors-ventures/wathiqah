import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactInput } from './dto/create-contact.input';
import { UpdateContactInput } from './dto/update-contact.input';
import { normalizeEmail, splitName } from '../../common/utils/string.utils';
import { NotificationService } from '../notifications/notification.service';
import { v4 as uuidv4 } from 'uuid';
import {
  AssetCategory,
  Contact,
  InvitationStatus,
  Prisma,
} from '../../generated/prisma/client';
import {
  FilterContactInput,
  ContactBalanceStanding,
} from './dto/filter-contact.input';

/** + = contact owes me, − = I owe contact. GIFT excluded (no ongoing obligation). */
const CONTACT_STANDING_SIGN: Partial<Record<string, 1 | -1>> = {
  LOAN_GIVEN: 1,
  REPAYMENT_MADE: 1,
  ADVANCE_PAID: 1,
  DEPOSIT_PAID: 1,
  REMITTED: 1,
  LOAN_RECEIVED: -1,
  REPAYMENT_RECEIVED: -1,
  ADVANCE_RECEIVED: -1,
  DEPOSIT_RECEIVED: -1,
  ESCROWED: -1,
};

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(createContactInput: CreateContactInput, userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required to create a contact');
    }

    const { name, email: rawEmail, ...rest } = createContactInput;
    const email = rawEmail ? normalizeEmail(rawEmail) : undefined;
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

  async findAll(userId: string, filter?: FilterContactInput) {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 25;
    const search = filter?.search;

    const where: Prisma.ContactWhereInput = {
      userId,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Two-phase query: balance standing requires in-memory filtering
    if (
      filter?.balanceStanding &&
      filter.balanceStanding !== ContactBalanceStanding.ALL
    ) {
      const allContacts = await this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            select: {
              type: true,
              amount: true,
              status: true,
            },
          },
        },
      });

      const filtered = allContacts.filter((c) => {
        const balance = this.computeContactBalance(c.transactions);
        if (filter.balanceStanding === ContactBalanceStanding.OWED_TO_ME)
          return balance > 0;
        if (filter.balanceStanding === ContactBalanceStanding.I_OWE)
          return balance < 0;
        return true;
      });

      const total = filtered.length;
      const items = filtered.slice((page - 1) * limit, page * limit);
      return { items, total, page, limit };
    }

    const [total, items] = await Promise.all([
      this.prisma.contact.count({ where }),
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total, page, limit };
  }

  private computeContactBalance(
    transactions: Array<{ type: string; amount: unknown; status: string }>,
    isCreator = true,
  ): number {
    let balance = 0;
    for (const tx of transactions) {
      if (tx.status === 'CANCELLED') continue;
      const amount =
        typeof tx.amount === 'object' &&
        tx.amount !== null &&
        'toNumber' in tx.amount
          ? (tx.amount as { toNumber: () => number }).toNumber()
          : Number(tx.amount);
      const sign = CONTACT_STANDING_SIGN[tx.type] ?? 0;
      balance += isCreator ? sign * amount : -sign * amount;
    }
    return balance;
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

    // Allow access if the user is the owner OR the linked user (shared ledger)
    if (contact.userId !== userId && contact.linkedUserId !== userId) {
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

    const normalizedEmail = email ? normalizeEmail(email) : undefined;

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...nameData,
        ...(email !== undefined && { email: normalizedEmail }),
        ...(phoneNumber !== undefined && { phoneNumber }),
      },
    });
  }

  async remove(id: string, userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required to remove a contact');
    }

    // Check existence and ownership
    await this.findOne(id, userId);

    return this.prisma.contact.delete({
      where: { id },
    });
  }

  async getBalance(contactId: string, userId: string): Promise<number> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: { linkedUserId: true },
    });

    const where: Prisma.TransactionWhereInput = {
      OR: [
        {
          contactId,
          category: AssetCategory.FUNDS,
          status: { not: 'CANCELLED' },
        },
      ],
    };

    if (contact?.linkedUserId) {
      where.OR.push({
        // Transactions where the contact is the creator and the current user is the contact
        createdById: contact.linkedUserId,
        contact: {
          linkedUserId: userId,
        },
        category: AssetCategory.FUNDS,
        status: { not: 'CANCELLED' },
      });
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        parentId: true,
        createdById: true,
        conversions: {
          where: {
            type: 'GIFT_GIVEN',
          },
          select: {
            amount: true,
          },
        },
      },
    });

    let balance = 0;
    for (const tx of transactions) {
      const isCreator = tx.createdById === userId;

      // If this is a GIFT_GIVEN/GIFT_RECEIVED transaction that has a parent, it's a conversion.
      if (
        (tx.type === 'GIFT_GIVEN' || tx.type === 'GIFT_RECEIVED') &&
        tx.parentId
      ) {
        continue;
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

      const sign = CONTACT_STANDING_SIGN[tx.type] ?? 0;
      balance += isCreator ? sign * amount : -sign * amount;
    }

    return balance;
  }

  async checkContactOnPlatform(
    id: string,
    userId: string,
    contactData?: Contact,
  ) {
    const contact = contactData || (await this.findOne(id, userId));

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

    // Check if there's already a pending invitation for this contact and inviter
    const existingInvitation = await this.prisma.contactInvitation.findFirst({
      where: {
        contactId: id,
        inviterId: userId,
        status: InvitationStatus.PENDING,
      },
    });

    let invitation;
    if (existingInvitation) {
      // Update existing invitation
      invitation = await this.prisma.contactInvitation.update({
        where: { id: existingInvitation.id },
        data: {
          token,
          expiresAt,
          status: InvitationStatus.PENDING,
        },
      });
    } else {
      // Create new invitation
      invitation = await this.prisma.contactInvitation.create({
        data: {
          token,
          expiresAt,
          contactId: id,
          inviterId: userId,
          status: InvitationStatus.PENDING,
        },
      });
    }

    // Send email
    await this.notificationService.sendContactInvitationEmail(
      contact.email,
      contact.firstName,
      `${contact.user.firstName} ${contact.user.lastName}`,
      token,
    );

    return {
      success: true,
      message: existingInvitation
        ? 'Invitation resent successfully'
        : 'Invitation sent successfully',
      invitation,
    };
  }

  async resendContactInvitation(contactId: string, userId: string) {
    const invitation = await this.prisma.contactInvitation.findFirst({
      where: {
        contactId,
        inviterId: userId,
        status: InvitationStatus.PENDING,
      },
    });

    if (!invitation) {
      throw new NotFoundException(
        'No pending invitation found for this contact',
      );
    }

    return this.inviteContactToPlatform(contactId, userId);
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
