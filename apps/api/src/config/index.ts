import databaseConfig from './database.config';
import authConfig from './auth.config';
import appConfig from './app.config';
import redisConfig from './redis.config';
import sendgridConfig from './sendgrid.config';
import twilioConfig from './twilio.config';
import mailtrapConfig from './mailtrap.config';
import notificationConfig from './notification.config';
import exchangeRateConfig from './exchange-rate.config';
import geoipConfig from './geoip.config';

export default [
  databaseConfig,
  authConfig,
  appConfig,
  redisConfig,
  sendgridConfig,
  twilioConfig,
  mailtrapConfig,
  notificationConfig,
  exchangeRateConfig,
  geoipConfig,
];
