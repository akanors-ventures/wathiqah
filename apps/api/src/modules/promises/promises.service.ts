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

  async create(
    createPromiseInput: CreatePromiseInput,
    userId: string,
    orgId: string | null,
  ) {
    return this.prisma.promise.create({
      data: {
        ...createPromiseInput,
        userId,
        ...(orgId != null && { orgId }),
      },
    });
  }

  async findAll(userId: string, orgId: string | null) {
    // Check for overdue promises and update them
    await this.updateOverduePromises(userId, orgId);

    const where = orgId ? { orgId } : { userId, orgId: null };

    return this.prisma.promise.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: string, userId: string, orgId?: string | null) {
    const promise = await this.prisma.promise.findUnique({ where: { id } });
    if (!promise) throw new NotFoundException('Promise not found');

    const ownedByUser = promise.userId === userId;
    const ownedByOrg = !!promise.orgId && promise.orgId === orgId;

    if (!ownedByUser && !ownedByOrg) {
      throw new ForbiddenException('You do not have access to this promise');
    }
    return promise;
  }

  async update(
    id: string,
    updatePromiseInput: UpdatePromiseInput,
    userId: string,
    orgId?: string | null,
  ) {
    await this.findOne(id, userId, orgId); // Ensure existence and ownership
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...data } = updatePromiseInput;
    return this.prisma.promise.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string, orgId?: string | null) {
    await this.findOne(id, userId, orgId); // Ensure existence and ownership
    return this.prisma.promise.delete({ where: { id } });
  }

  private async updateOverduePromises(userId: string, orgId: string | null) {
    const now = new Date();
    const where = orgId
      ? { orgId, status: PromiseStatus.PENDING, dueDate: { lt: now } }
      : {
          userId,
          orgId: null,
          status: PromiseStatus.PENDING,
          dueDate: { lt: now },
        };
    await this.prisma.promise.updateMany({
      where,
      data: { status: PromiseStatus.OVERDUE },
    });
  }
}
