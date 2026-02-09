import { registerAs } from '@nestjs/config';

export default registerAs('geoip', () => ({
  apiKey: process.env.IP2LOCATION_API_KEY || 'demo',
}));
