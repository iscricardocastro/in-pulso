"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelPurchaseOrder, deletePurchaseOrder } from "@/services/purchase-orders";
import type { PurchaseOrder } from "@/types/database";

type OrderStage = "all" | "planning" | "payment" | "transit" | "received" | "canceled";

export function usePurchaseOrderActions({ order, onStageChange }: { order: PurchaseOrder; onStageChange?: (stage: OrderStage) => void }) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const canCancel = order.status !== "received" && order.status !== "canceled";

  function cancel() {
    startTransition(async () => {
      try {
        await cancelPurchaseOrder({ order_id: order.id, note });
        onStageChange?.("canceled");
        toast.success("Pedido cancelado. Pedido movido a Cancelados.");
        setCancelOpen(false);
        setNote("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cancelar");
      }
    });
  }

  async function deleteOrder() {
    try {
      await deletePurchaseOrder(order.id);
      toast.success("Pedido eliminado");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
      throw error;
    }
  }

  return { canCancel, cancelOpen, note, pending, cancel, deleteOrder, setCancelOpen, setNote };
}
