import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Configuration, IPGeolocation } from 'ip2location-io-nodejs';

import { GeoIPInfo } from './entities/geoip-info.entity';

@Injectable()
export class GeoIPService {
  private readonly logger = new Logger(GeoIPService.name);
  private readonly ipl: IPGeolocation;
  private readonly CACHE_TTL = 86400000; // 24 hours in milliseconds

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const apiKey = this.configService.get<string>('geoip.apiKey');
    const config = new Configuration(apiKey || 'demo');
    this.ipl = new IPGeolocation(config);
  }

  async lookup(ip: string): Promise<GeoIPInfo> {
    try {
      // Check Cache first
      const cacheKey = `geoip:${ip}`;
      const cached = await this.cacheManager.get<GeoIPInfo>(cacheKey);
      if (cached) {
        return cached;
      }

      // Localhost/Private IP fallback to Nigeria for testing
      if (
        ip === '::1' ||
        ip === '127.0.0.1' ||
        ip === '::ffff:127.0.0.1' ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.')
      ) {
        const localInfo = {
          ip,
          countryCode: 'NG',
          countryName: 'Nigeria',
          regionName: 'Lagos',
          cityName: 'Lagos',
          currencyCode: 'NGN',
          isVpn: false,
        };
        await this.cacheManager.set(cacheKey, localInfo, this.CACHE_TTL);
        return localInfo;
      }

      // Remote Lookup
      const result = await this.ipl.lookup(ip, 'en');

      const info: GeoIPInfo = {
        ip,
        countryCode: result.country_code || 'US',
        countryName: result.country_name || 'United States',
        regionName: result.region_name || 'Unknown',
        cityName: result.city_name || 'Unknown',
        currencyCode: result.currency?.code || 'USD',
        isVpn: !!result.is_proxy,
      };

      // Cache result
      await this.cacheManager.set(cacheKey, info, this.CACHE_TTL);

      return info;
    } catch (error) {
      this.logger.error(`GeoIP lookup failed for IP ${ip}: ${error.message}`);
      // Safety fallback to USD/US
      return {
        ip,
        countryCode: 'US',
        countryName: 'United States',
        regionName: 'Unknown',
        cityName: 'Unknown',
        currencyCode: 'USD',
        isVpn: false,
      };
    }
  }
}
