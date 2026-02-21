import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportResolver } from './support.resolver';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { GeoIPInterceptor } from 'src/common/interceptors/geoip.interceptor';
import { GeoIPService } from '../geoip/geoip.service';

@Module({
  imports: [PrismaModule, PaymentModule],
  providers: [SupportService, SupportResolver, GeoIPService, GeoIPInterceptor],
  exports: [SupportService],
})
export class SupportModule {}
