import { addDays, format } from "date-fns";
import type { PurchaseOrderFormValues } from "@/features/purchase-orders/schemas";
import type { Product, Supplier } from "@/types/database";

export const emptyPurchaseOrderValues: PurchaseOrderFormValues = {
  supplier_id: "",
  status: "draft",
  expected_arrival: "",
  advance_percent: 0,
  advance_paid: 0,
  notes: "",
  expected_items: [{ product_id: "", quantity_requested: 1, unit_cost: 0 }],
};

export function calculateEstimatedTotal(items: PurchaseOrderFormValues["expected_items"] = []) {
  return items.reduce((total, item) => total + Number(item.quantity_requested || 0) * Number(item.unit_cost || 0), 0);
}

export function getExpectedArrival(supplier?: Supplier) {
  if (!supplier) return "";
  return format(addDays(new Date(), supplier.average_delivery_days), "yyyy-MM-dd");
}

export function getProductCost(products: Product[], productId: string) {
  return products.find((product) => product.id === productId)?.cost ?? 0;
}
