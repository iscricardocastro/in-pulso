"use client";

import { Check, CheckCircle2, ScanLine, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Textarea } from "@/components/ui/textarea";
import { useReceiveOrder } from "@/features/purchase-orders/hooks/use-receive-order";
import { getItemReceptionState } from "@/features/purchase-orders/utils/reception";
import { cn } from "@/lib/utils";
import type { Product, PurchaseOrder } from "@/types/database";

type OrderStage = "all" | "planning" | "payment" | "transit" | "received" | "canceled";

export function ReceiveOrderForm({
  order,
  products,
  onStageChange,
}: {
  order: PurchaseOrder;
  products: Product[];
  onStageChange?: (stage: OrderStage) => void;
}) {
  const reception = useReceiveOrder({ order, products, onStageChange });
  const {
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
  } = reception;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">Recepcion de mercancia</p>
            {closed ? (
              <Badge variant={closedIncomplete ? "warning" : "success"}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                {closedIncomplete ? "Cerrada incompleta" : "Cerrada"}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.status === "canceled" ? "Pedido cancelado. Recepcion deshabilitada." : "Escanea cada pieza o captura cantidades manualmente. Guardar recepcion agrega entradas al inventario."}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{summary.receivedQuantity} / {summary.requested} piezas</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Badge className="justify-center" variant="success">Lineas completas {summary.received}</Badge>
        <Badge className="justify-center" variant={summary.missing > 0 ? "warning" : "success"}>Piezas faltantes {summary.missing}</Badge>
        <Badge className="justify-center" variant={summary.extra > 0 ? "warning" : "secondary"}>Excedentes {summary.extra}</Badge>
      </div>

      {!closed && summary.missing > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Llegada incompleta</p>
            <p className="text-sm text-amber-800/80 dark:text-amber-200/80">
              Puedes guardar avance y dejar pedido abierto, o cerrar incompleto con una nota de evidencia.
            </p>
            <Textarea
              className="bg-background/80"
              placeholder="Ej. Proveedor entrego 8 de 10 piezas, faltan 2 por cancelar o reponer."
              value={receptionNote}
              onChange={(event) => setReceptionNote(event.target.value)}
            />
          </div>
        </div>
      ) : null}

      {closed && order.notes ? (
        <div className="motion-surface rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidencia</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{order.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={handleScanSubmit}
        >
          <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" disabled={closed} name="scan" placeholder="Escanear QR/codigo barras" />
        </form>
        <Button
          disabled={pending || closed}
          type="button"
          onClick={() => setConfirmReceiveAllOpen(true)}
        >
          <Zap className="h-4 w-4" />
          Recibir todo
        </Button>
      </div>

      {confirmReceiveAllOpen ? (
        <ModalOverlay role="alertdialog">
          <div className="animate-pop w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-base font-semibold">Recibir todo</h2>
              <p className="text-sm text-muted-foreground">
                Esto marcara todas las piezas esperadas como recibidas y cerrara la recepcion completa. Confirma solo si ya verificaste la mercancia.
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={pending} type="button" variant="secondary" onClick={() => setConfirmReceiveAllOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={pending} type="button" onClick={receiveAll}>
                <Zap className="h-4 w-4" />
                {pending ? "Recibiendo..." : "Confirmar recepcion"}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}

      <div className="space-y-2">
        {items.map((item, index) => {
          const product = productById.get(item.product_id);
          const received = item.received_quantity ?? 0;
          const state = getItemReceptionState(item);
          return (
            <div
              key={`${item.product_id}-${index}`}
              className={cn(
                "motion-list-item grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/45 md:grid-cols-[1fr_110px_120px_104px] md:items-center",
                state === "Completo" && "border-emerald-500/25 bg-emerald-500/5",
              )}
            >
              <div>
                <p className="font-medium">{product?.name || "Producto"}</p>
                <p className="text-sm text-muted-foreground">{product?.internal_code || ""}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Esperada</p>
                <p className="font-medium">{item.quantity_requested}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recibida</p>
                <Input
                  disabled={closed}
                  min={0}
                  type="number"
                  value={received}
                  onChange={(event) => updateReceived(index, Number(event.target.value))}
                />
              </div>
              <Badge variant={state === "Completo" ? "success" : "warning"}>{state}</Badge>
            </div>
          );
        })}
      </div>

      <Button
        disabled={pending || closed}
        type="button"
        variant={summary.missing === 0 ? "default" : "outline"}
        onClick={saveProgressOrOpenClose}
      >
        <Check className="h-4 w-4" />
        {pending ? "Guardando..." : summary.missing === 0 ? "Guardar y cerrar recepcion" : "Guardar avance"}
      </Button>
      {confirmCloseReceptionOpen ? (
        <ModalOverlay role="alertdialog">
          <div className="animate-pop w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-base font-semibold">Cerrar recepcion</h2>
              <p className="text-sm text-muted-foreground">
                Esto cerrara la recepcion completa y actualizara inventario. Confirma que todas las cantidades recibidas son correctas.
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={pending} type="button" variant="secondary" onClick={() => setConfirmCloseReceptionOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={pending} type="button" onClick={closeReception}>
                <Check className="h-4 w-4" />
                {pending ? "Cerrando..." : "Confirmar cierre"}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
      {!closed && summary.missing > 0 ? (
        <Button
          disabled={pending || receptionNote.trim().length === 0}
          type="button"
          variant="secondary"
          onClick={closeIncomplete}
        >
          <CheckCircle2 className="h-4 w-4" />
          Cerrar incompleto
        </Button>
      ) : null}
    </div>
  );
}
