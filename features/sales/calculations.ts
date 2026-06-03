import { roundMoney } from "@/lib/money";
import { parseNumberValue } from "@/lib/value-parsing";
import type { DiscountType } from "@/types/database";

export { roundMoney };

export type DiscountInput = {
  type?: DiscountType | null;
  value?: number | string | null;
};

export type SaleCalculationItem = {
  quantity: number | string;
  unit_price: number | string;
  discount?: DiscountInput;
};

export function toNumber(value: number | string | null | undefined) {
  return parseNumberValue(value) ?? 0;
}

export function discountAmount(base: number, discount?: DiscountInput) {
  const value = toNumber(discount?.value);
  if (!discount?.type || value <= 0 || base <= 0) return 0;
  const amount = discount.type === "percent" ? base * (Math.min(value, 100) / 100) : value;
  return roundMoney(Math.min(base, amount));
}

export function lineSubtotal(item: SaleCalculationItem) {
  return roundMoney(toNumber(item.quantity) * toNumber(item.unit_price));
}

export function lineTotal(item: SaleCalculationItem) {
  const subtotal = lineSubtotal(item);
  return roundMoney(subtotal - discountAmount(subtotal, item.discount));
}

export function saleTotals(items: SaleCalculationItem[], discount?: DiscountInput) {
  const subtotal = roundMoney(items.reduce((total, item) => total + lineTotal(item), 0));
  const discount_total = discountAmount(subtotal, discount);
  const total = roundMoney(subtotal - discount_total);
  return { subtotal, discount_total, total };
}
