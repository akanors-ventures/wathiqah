import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactInput } from './dto/create-contact.input';
import { UpdateContactInput } from './dto/update-contact.input';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  create(createContactInput: CreateContactInput, userId: string) {
    return this.prisma.contact.create({
      data: {
        ...createContactInput,
        userId,
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
    const contact = await this.prisma.contact.findFirst({
      where: { id, userId },
      include: {
        transactions: true,
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
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

    return this.prisma.contact.update({
      where: { id },
      data: {
        // Exclude ID from update data
        name: updateContactInput.name,
        email: updateContactInput.email,
        phoneNumber: updateContactInput.phoneNumber,
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
}
