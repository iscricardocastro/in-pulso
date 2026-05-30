"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  buildInitialReceivedItems,
  calculateReceptionSummary,
  getReceptionProgress,
} from "@/features/purchase-orders/utils/reception";
import { receivePurchaseOrder } from "@/services/purchase-orders";
import type { Product, PurchaseOrder, PurchaseOrderItem } from "@/types/database";

type OrderStage = "all" | "planning" | "payment" | "transit" | "received" | "canceled";

export function useReceiveOrder({
  order,
  products,
  onStageChange,
}: {
  order: PurchaseOrder;
  products: Product[];
  onStageChange?: (stage: OrderStage) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [receptionNote, setReceptionNote] = useState("");
  const [confirmReceiveAllOpen, setConfirmReceiveAllOpen] = useState(false);
  const [confirmCloseReceptionOpen, setConfirmCloseReceptionOpen] = useState(false);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const productByCode = useMemo(() => new Map(products.map((product) => [product.internal_code.toLowerCase(), product])), [products]);
  const [items, setItems] = useState<PurchaseOrderItem[]>(() => buildInitialReceivedItems(order));
  const summary = useMemo(() => calculateReceptionSummary(items), [items]);
  const progress = getReceptionProgress(summary);
  const closed = order.status === "received" || order.status === "canceled";
  const closedIncomplete = closed && summary.missing > 0;

  function updateReceived(index: number, received_quantity: number) {
    setItems((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, received_quantity: Math.max(0, received_quantity) } : entry,
      ),
    );
  }

  function save(nextItems: PurchaseOrderItem[], message: string, options?: { closeOrder?: boolean; note?: string }) {
    startTransition(async () => {
      try {
        await receivePurchaseOrder({
          order_id: order.id,
          received_items: nextItems,
          close_order: options?.closeOrder,
          reception_note: options?.note,
        });
        const allReceived = nextItems.every((item) => (item.received_quantity ?? 0) >= item.quantity_requested);
        const nextStage = allReceived || options?.closeOrder ? "received" : "transit";
        onStageChange?.(nextStage);
        toast.success(`${message}. Pedido movido a ${nextStage === "received" ? "Recibidos" : "Llegada"}.`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo recibir");
      }
    });
  }

  function receiveAll() {
    const nextItems = items.map((item) => ({
      ...item,
      received_quantity: item.quantity_requested,
    }));
    setItems(nextItems);
    setConfirmReceiveAllOpen(false);
    save(nextItems, "Orden recibida completa");
  }

  function closeReception() {
    setConfirmCloseReceptionOpen(false);
    save(items, "Recepcion cerrada");
  }

  function closeIncomplete() {
    save(items, "Pedido cerrado incompleto", { closeOrder: true, note: receptionNote });
  }

  function saveProgressOrOpenClose() {
    if (summary.missing === 0) {
      setConfirmCloseReceptionOpen(true);
      return;
    }
    save(items, "Recepcion actualizada");
  }

  function handleScanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("scan") as HTMLInputElement;
    const product = productByCode.get(input.value.trim().toLowerCase());
    const index = items.findIndex((item) => item.product_id === product?.id);
    if (index === -1) {
      toast.error("Codigo no pertenece a esta orden");
      return;
    }
    updateReceived(index, (items[index].received_quantity ?? 0) + 1);
    input.value = "";
  }

  return {
    closed,
    closedIncomplete,
    confirmCloseReceptionOpen,
    confirmReceiveAllOpen,
    items,
    pending,
    productById,
    progress,
    receptionNote,
    summary,
    closeIncomplete,
    closeReception,
    handleScanSubmit,
    receiveAll,
    saveProgressOrOpenClose,
    setConfirmCloseReceptionOpen,
    setConfirmReceiveAllOpen,
    setReceptionNote,
    updateReceived,
  };
}
