export const formatCurrency = (
  amount: number | string | null | undefined,
  minimumFractionDigits = 0,
) => {
  if (amount === null || amount === undefined) return "₦0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
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
