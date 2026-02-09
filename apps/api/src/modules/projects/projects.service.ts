import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateProjectInput) {
    return this.prisma.project.create({
      data: {
        ...input,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(userId: string, input: UpdateProjectInput) {
    // Verify ownership
    await this.findOne(input.id, userId);

    return this.prisma.project.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        budget: input.budget,
        currency: input.currency,
      },
    });
  }
}
