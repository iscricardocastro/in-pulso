"use client";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Textarea } from "@/components/ui/textarea";
import { usePurchaseOrderActions } from "@/features/purchase-orders/hooks/use-purchase-order-actions";
import type { PurchaseOrder } from "@/types/database";

type OrderStage = "all" | "planning" | "payment" | "transit" | "received" | "canceled";

export function PurchaseOrderActions({ order, onStageChange }: { order: PurchaseOrder; onStageChange?: (stage: OrderStage) => void }) {
  const { canCancel, cancelOpen, note, pending, cancel, deleteOrder, setCancelOpen, setNote } =
    usePurchaseOrderActions({ order, onStageChange });

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
        onConfirm={deleteOrder}
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
