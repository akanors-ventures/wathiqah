import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserNoteInput } from './dto/create-user-note.input';
import { UpdateUserNoteInput } from './dto/update-user-note.input';

@Injectable()
export class UserNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserNoteInput, userId: string) {
    return this.prisma.userNote.create({
      data: {
        userId,
        title: input.title,
        body: input.body,
        category: input.category,
      },
    });
  }

  async findAll(userId: string, category?: string) {
    return this.prisma.userNote.findMany({
      where: { userId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, input: UpdateUserNoteInput, userId: string) {
    await this.assertOwnership(id, userId);
    return this.prisma.userNote.update({ where: { id }, data: input });
  }

  async remove(id: string, userId: string) {
    await this.assertOwnership(id, userId);
    await this.prisma.userNote.delete({ where: { id } });
    return true;
  }

  private async assertOwnership(id: string, userId: string) {
    const note = await this.prisma.userNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');
    if (note.userId !== userId)
      throw new ForbiddenException('Note does not belong to this user');
  }
}
