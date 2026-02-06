import { Module } from '@nestjs/common';
import { WitnessesService } from './witnesses.service';
import { WitnessesResolver } from './witnesses.resolver';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  providers: [WitnessesResolver, WitnessesService],
  exports: [WitnessesService],
})
export class WitnessesModule {}
