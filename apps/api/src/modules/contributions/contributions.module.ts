import { Module } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import { ContributionsResolver } from './contributions.resolver';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { GeoIPInterceptor } from 'src/common/interceptors/geoip.interceptor';
import { GeoIPService } from '../geoip/geoip.service';

@Module({
  imports: [PrismaModule, PaymentModule],
  providers: [
    ContributionsService,
    ContributionsResolver,
    GeoIPService,
    GeoIPInterceptor,
  ],
  exports: [ContributionsService],
})
export class ContributionsModule {}
