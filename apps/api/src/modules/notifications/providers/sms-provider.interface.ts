export interface SmsPayload {
  to: string; // E.164 format preferred: +234...
  body: string;
}

export abstract class SmsProvider {
  abstract sendSms(payload: SmsPayload): Promise<void>;
}
