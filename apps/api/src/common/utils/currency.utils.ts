/**
 * Determines the appropriate locale for currency formatting based on the currency code.
 * Defaults to 'en-NG' for NGN and 'en-US' for others to ensure standard English formatting.
 */
export const getLocaleForCurrency = (currency: string): string => {
  switch (currency?.toUpperCase()) {
    case 'NGN':
      return 'en-NG';
    case 'GBP':
      return 'en-GB';
    case 'EUR':
      return 'en-IE'; // English in Eurozone
    case 'CAD':
      return 'en-CA';
    case 'AUD':
      return 'en-AU';
    case 'SAR':
      return 'ar-SA';
    case 'AED':
      return 'ar-AE';
    default:
      return 'en-US';
  }
};
