import { Module } from '@nestjs/common';
import { WitnessesService } from './witnesses.service';
import { WitnessesResolver } from './witnesses.resolver';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [WitnessesResolver, WitnessesService],
  exports: [WitnessesService],
})
export class WitnessesModule {}
