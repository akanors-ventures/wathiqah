import { Module } from '@nestjs/common';
import { WitnessesService } from './witnesses.service';
import { WitnessesResolver } from './witnesses.resolver';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WitnessesResolver, WitnessesService],
  exports: [WitnessesService],
})
export class WitnessesModule {}
