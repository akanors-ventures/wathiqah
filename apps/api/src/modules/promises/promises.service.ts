import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromiseInput } from './dto/create-promise.input';
import { UpdatePromiseInput } from './dto/update-promise.input';
import { PromiseStatus } from '../../generated/prisma/client';

@Injectable()
export class PromisesService {
  constructor(private prisma: PrismaService) {}

  async create(createPromiseInput: CreatePromiseInput, userId: string) {
    return this.prisma.promise.create({
      data: {
        ...createPromiseInput,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    // Check for overdue promises and update them
    await this.updateOverduePromises(userId);

    return this.prisma.promise.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const promise = await this.prisma.promise.findUnique({ where: { id } });
    if (!promise) {
      throw new NotFoundException(`Promise with ID ${id} not found`);
    }
    if (promise.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this promise',
      );
    }
    return promise;
  }

  async update(
    id: string,
    updatePromiseInput: UpdatePromiseInput,
    userId: string,
  ) {
    await this.findOne(id, userId); // Ensure existence and ownership
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...data } = updatePromiseInput;
    return this.prisma.promise.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Ensure existence and ownership
    return this.prisma.promise.delete({ where: { id } });
  }

  private async updateOverduePromises(userId: string) {
    const now = new Date();
    await this.prisma.promise.updateMany({
      where: {
        userId,
        status: PromiseStatus.PENDING,
        dueDate: { lt: now },
      },
      data: { status: PromiseStatus.OVERDUE },
    });
  }
}
