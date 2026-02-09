import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsResolver } from './donations.resolver';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DonationsService, DonationsResolver],
  exports: [DonationsService],
})
export class DonationsModule {}
