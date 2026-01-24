import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  resetPasswordTokenExpiry: process.env.RESET_PASSWORD_TOKEN_EXPIRY || '1h',
  inviteTokenExpiry: process.env.INVITE_TOKEN_EXPIRY || '7d',
}));
