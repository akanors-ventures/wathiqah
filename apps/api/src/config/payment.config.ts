import { registerAs } from '@nestjs/config';

export default registerAs('payment', () => ({
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    proPlanId: process.env.STRIPE_PRO_PLAN_ID,
  },
  flutterwave: {
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
    webhookHash: process.env.FLUTTERWAVE_WEBHOOK_HASH,
    proPlanId: process.env.FLUTTERWAVE_PRO_PLAN_ID,
    supportLink: process.env.FLUTTERWAVE_SUPPORT_LINK,
  },
  lemonsqueezy: {
    apiKey: process.env.LEMON_SQUEEZY_API_KEY,
    webhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET,
    storeId: process.env.LEMON_SQUEEZY_STORE_ID,
    proVariantId: process.env.LEMON_SQUEEZY_PRO_VARIANT_ID,
    supportVariantId: process.env.LEMON_SQUEEZY_SUPPORT_VARIANT_ID,
  },
  globalProvider: process.env.GLOBAL_PAYMENT_PROVIDER || 'stripe', // 'stripe' or 'lemonsqueezy'
  successUrl:
    process.env.PAYMENT_SUCCESS_URL || 'http://localhost:3000/payment/success',
  cancelUrl:
    process.env.PAYMENT_CANCEL_URL || 'http://localhost:3000/payment/cancel',
}));
