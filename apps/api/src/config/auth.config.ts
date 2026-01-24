import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  resetPasswordTokenExpiry: process.env.JWT_RESET_PASSWORD_EXPIRY || '1h',
  inviteTokenExpiry: process.env.JWT_INVITE_TOKEN_EXPIRY || '7d',
}));
