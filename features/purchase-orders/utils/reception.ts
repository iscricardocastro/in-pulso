import type { PurchaseOrder, PurchaseOrderItem } from "@/types/database";

export type ReceptionSummary = {
  received: number;
  receivedQuantity: number;
  requested: number;
  missing: number;
  extra: number;
};

export function buildInitialReceivedItems(order: PurchaseOrder) {
  const receivedById = new Map(order.received_items.map((item) => [item.product_id, item.received_quantity ?? 0]));
  return order.expected_items.map((item) => ({
    ...item,
    received_quantity: receivedById.get(item.product_id) ?? item.received_quantity ?? 0,
  }));
}

export function calculateReceptionSummary(items: PurchaseOrderItem[]): ReceptionSummary {
  return items.reduce(
    (acc, item) => {
      const received = item.received_quantity ?? 0;
      acc.requested += item.quantity_requested;
      acc.receivedQuantity += Math.min(received, item.quantity_requested);
      if (received >= item.quantity_requested) acc.received += 1;
      if (received < item.quantity_requested) acc.missing += item.quantity_requested - received;
      if (received > item.quantity_requested) acc.extra += received - item.quantity_requested;
      return acc;
    },
    { received: 0, receivedQuantity: 0, requested: 0, missing: 0, extra: 0 },
  );
}

export function getReceptionProgress(summary: ReceptionSummary) {
  return summary.requested === 0 ? 0 : Math.min(100, Math.round((summary.receivedQuantity / summary.requested) * 100));
}

export function getItemReceptionState(item: PurchaseOrderItem) {
  const received = item.received_quantity ?? 0;
  return received === item.quantity_requested ? "Completo" : received > item.quantity_requested ? "Excedente" : "Faltante";
}
