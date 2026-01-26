import { registerAs } from '@nestjs/config';

export default registerAs('mailtrap', () => ({
  token: process.env.MAILTRAP_TOKEN,
  useSandbox: process.env.MAILTRAP_USE_SANDBOX,
  testInboxId: process.env.MAILTRAP_TEST_INBOX_ID,
}));
