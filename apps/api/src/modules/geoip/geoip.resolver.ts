import { Resolver, Query, Context } from '@nestjs/graphql';
import { GeoIPService } from './geoip.service';
import { GeoIPInfo } from './entities/geoip-info.entity';
import { Request } from 'express';

@Resolver(() => GeoIPInfo)
export class GeoIPResolver {
  constructor(private readonly geoIPService: GeoIPService) {}

  @Query(() => GeoIPInfo, { name: 'getGeoIPInfo' })
  async getGeoIPInfo(@Context('req') req: Request): Promise<GeoIPInfo> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    return this.geoIPService.lookup(ip);
  }
}
