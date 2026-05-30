"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markPurchaseOrderInTransit, recordPurchaseOrderPayment } from "@/services/purchase-orders";
import type { CatalogItem, PurchaseOrder } from "@/types/database";

type OrderStage = "all" | "planning" | "payment" | "transit" | "received" | "canceled";

export function usePurchaseOrderStatus({
  order,
  catalogs,
  onStageChange,
}: {
  order: PurchaseOrder;
  catalogs: CatalogItem[];
  onStageChange?: (stage: OrderStage) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const paymentMethods = useMemo(() => catalogs.filter((item) => item.kind === "payment_method"), [catalogs]);
  const balance = Math.max(0, Number(order.estimated_total) - Number(order.advance_paid));
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentMethodName, setPaymentMethodName] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [transitNote, setTransitNote] = useState("");
  const [confirmPaymentOpen, setConfirmPaymentOpen] = useState(false);
  const [confirmTransitOpen, setConfirmTransitOpen] = useState(false);
  const closed = order.status === "received" || order.status === "canceled";
  const canPay = !closed && balance > 0;
  const canMarkTransit = order.status === "paid" || order.status === "partially_paid";

  function refresh(message: string, nextStage: OrderStage) {
    onStageChange?.(nextStage);
    toast.success(message);
    router.refresh();
  }

  function recordPayment() {
    startTransition(async () => {
      try {
        await recordPurchaseOrderPayment({
          order_id: order.id,
          amount,
          payment_method_id: paymentMethodId,
          note: paymentNote,
        });
        setPaymentNote("");
        setConfirmPaymentOpen(false);
        refresh("Pago registrado. Pedido movido a Pago.", "payment");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar pago");
      }
    });
  }

  function markTransit() {
    startTransition(async () => {
      try {
        await markPurchaseOrderInTransit({ order_id: order.id, note: transitNote });
        setTransitNote("");
        setConfirmTransitOpen(false);
        refresh("Pedido marcado en camino. Pedido movido a Llegada.", "transit");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar pedido");
      }
    });
  }

  function selectPaymentMethod(item: { id: string; name: string }) {
    setPaymentMethodId(item.id);
    setPaymentMethodName(item.name);
  }

  return {
    amount,
    balance,
    canMarkTransit,
    canPay,
    closed,
    confirmPaymentOpen,
    confirmTransitOpen,
    paymentMethodId,
    paymentMethodName,
    paymentMethods,
    paymentNote,
    pending,
    transitNote,
    markTransit,
    recordPayment,
    selectPaymentMethod,
    setAmount,
    setConfirmPaymentOpen,
    setConfirmTransitOpen,
    setPaymentMethodId,
    setPaymentMethodName,
    setPaymentNote,
    setTransitNote,
  };
}
