import { Module } from '@nestjs/common';
import { PersonalEntriesService } from './personal-entries.service';
import { PersonalEntriesResolver } from './personal-entries.resolver';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [PersonalEntriesResolver, PersonalEntriesService, PrismaService],
})
export class PersonalEntriesModule {}
