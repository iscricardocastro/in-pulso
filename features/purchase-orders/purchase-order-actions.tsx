"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Textarea } from "@/components/ui/textarea";
import { cancelPurchaseOrder, deletePurchaseOrder } from "@/services/purchase-orders";
import type { PurchaseOrder } from "@/types/database";

type OrderStage = "all" | "planning" | "payment" | "transit" | "received" | "canceled";

export function PurchaseOrderActions({ order, onStageChange }: { order: PurchaseOrder; onStageChange?: (stage: OrderStage) => void }) {
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

  return (
    <div className="flex items-center gap-1">
      {canCancel ? (
        <Button aria-label="Cancelar pedido" size="icon" type="button" variant="ghost" onClick={() => setCancelOpen(true)}>
          <Ban className="h-4 w-4" />
        </Button>
      ) : null}
      <ConfirmDeleteButton
        title="Eliminar pedido"
        description="Esto borra el pedido. Si ya recibiste piezas, se hara una salida de inventario para revertir la recepcion."
        onConfirm={async () => {
          try {
            await deletePurchaseOrder(order.id);
            toast.success("Pedido eliminado");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar");
            throw error;
          }
        }}
      />

      {cancelOpen ? (
        <ModalOverlay role="alertdialog">
          <div className="animate-pop w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-base font-semibold">Cancelar pedido</h2>
              <p className="text-sm text-muted-foreground">El pedido queda como cancelado y conserva historial. Puedes agregar motivo o referencia.</p>
              <Textarea placeholder="Motivo de cancelacion" value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={pending} type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
                Cerrar
              </Button>
              <Button disabled={pending} type="button" variant="destructive" onClick={cancel}>
                {pending ? "Cancelando..." : "Cancelar pedido"}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </div>
  );
}
