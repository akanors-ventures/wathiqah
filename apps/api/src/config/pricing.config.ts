import { registerAs } from '@nestjs/config';
import { PRO_PRICING } from '../modules/subscription/subscription.constants';

export default registerAs('pricing', () => PRO_PRICING);
