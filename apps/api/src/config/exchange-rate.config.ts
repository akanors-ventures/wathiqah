import { registerAs } from '@nestjs/config';

export default registerAs('fx', () => ({
  openExchange: {
    appId: process.env.OPEN_EXCHANGE_RATES_APP_ID || '',
    baseUrl: 'https://openexchangerates.org/api',
  },
  exchangeRate: {
    apiKey: process.env.EXCHANGE_RATE_API_KEY || '',
    baseUrl: 'https://v6.exchangerate-api.com/v6',
  },
}));
