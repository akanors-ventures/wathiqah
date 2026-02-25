export const getLocaleForCurrency = (currency: string): string => {
  switch (currency?.toUpperCase()) {
    case "NGN":
      return "en-NG";
    case "GBP":
      return "en-GB";
    case "EUR":
      return "en-IE"; // English in Eurozone
    case "CAD":
      return "en-CA";
    case "AUD":
      return "en-AU";
    case "SAR":
      return "ar-SA";
    case "AED":
      return "ar-AE";
    default:
      return "en-US";
  }
};

export const formatCurrency = (
  amount: number | string | null | undefined,
  currency = "NGN",
  minimumFractionDigits = 0,
) => {
  const currencyCode = currency || "NGN";
  const locale = getLocaleForCurrency(currencyCode);

  if (amount === null || amount === undefined) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits,
    }).format(0);
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};
