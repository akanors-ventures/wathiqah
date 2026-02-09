import { SetMetadata } from '@nestjs/common';
import { TierLimits } from '../subscription.constants';

export const CHECK_FEATURE_KEY = 'check_feature';
export const CheckFeature = (feature: keyof TierLimits) =>
  SetMetadata(CHECK_FEATURE_KEY, feature);
