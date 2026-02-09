import { Module } from '@nestjs/common';
import { GeoIPService } from './geoip.service';
import { GeoIPResolver } from './geoip.resolver';

@Module({
  providers: [GeoIPService, GeoIPResolver],
  exports: [GeoIPService],
})
export class GeoIPModule {}
