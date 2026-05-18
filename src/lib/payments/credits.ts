export const CREDIT_PACK = {
  id: "credits_100",
  name: "100 Credits",
  credits: 100,
  amount: 20000,
  currency: "VND",
  description: "UVIBE100",
} as const;

export const CREDIT_PAYMENT_DURATION_DAYS = 30;

export function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
