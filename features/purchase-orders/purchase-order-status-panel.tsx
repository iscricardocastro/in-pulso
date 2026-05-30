"use client";

import { CreditCard, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Textarea } from "@/components/ui/textarea";
import { usePurchaseOrderStatus } from "@/features/purchase-orders/hooks/use-purchase-order-status";
import { createCatalogItem } from "@/services/catalogs";
import type { CatalogItem, PurchaseOrder } from "@/types/database";

type OrderStage = "all" | "planning" | "payment" | "transit" | "received" | "canceled";

export function PurchaseOrderStatusPanel({
  order,
  catalogs,
  onStageChange,
}: {
  order: PurchaseOrder;
  catalogs: CatalogItem[];
  onStageChange?: (stage: OrderStage) => void;
}) {
  const status = usePurchaseOrderStatus({ order, catalogs, onStageChange });
  const {
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
    setPaymentNote,
    setTransitNote,
  } = status;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="motion-surface rounded-lg border border-border/70 bg-muted/20 p-3">
        <div className="mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Pagos</p>
        </div>
        {canPay ? (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div className="space-y-2">
                <Label>Monto</Label>
                <Input max={balance} min={0.01} step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
                {Number(amount) > balance ? <p className="text-xs text-destructive">No puede exceder saldo: {balance}</p> : null}
              </div>
              <div className="space-y-2">
                <Label>Metodo de pago</Label>
                <CreatableCombobox
                  createSuccessMessage="Metodo de pago creado"
                  emptyLabel="Sin metodos"
                  options={paymentMethods}
                  placeholder="Buscar o agregar metodo"
                  selectedValue={paymentMethodId}
                  value={paymentMethodName}
                  valueMode="id"
                  onChange={(value) => setPaymentMethodId(value)}
                  onCreate={(name) => createCatalogItem("payment_method", name)}
                  onSelect={selectPaymentMethod}
                />
              </div>
            </div>
            <Textarea placeholder="Nota de pago, referencia o comprobante" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} />
            <Button disabled={pending || !paymentMethodId || Number(amount) <= 0 || Number(amount) > balance} type="button" onClick={() => setConfirmPaymentOpen(true)}>
              <CreditCard className="h-4 w-4" />
              {pending ? "Registrando..." : "Registrar pago"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{closed ? "Pedido cerrado." : "Pedido pagado completo."}</p>
        )}
      </div>

      <div className="motion-surface rounded-lg border border-border/70 bg-muted/20 p-3">
        <div className="mb-3 flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Estado logistico</p>
        </div>
        {canMarkTransit ? (
          <div className="grid gap-3">
            <Textarea placeholder="Nota opcional, guia, paqueteria o acuerdo con proveedor" value={transitNote} onChange={(event) => setTransitNote(event.target.value)} />
            <Button disabled={pending} type="button" variant="outline" onClick={() => setConfirmTransitOpen(true)}>
              <Truck className="h-4 w-4" />
              {pending ? "Actualizando..." : "Marcar en camino"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{closed ? "Pedido cerrado." : "Registra pago para avanzar a camino."}</p>
        )}
      </div>

      {confirmPaymentOpen ? (
        <ModalOverlay role="alertdialog">
          <div className="animate-pop w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-base font-semibold">Registrar pago</h2>
              <p className="text-sm text-muted-foreground">
                Esto registrara el pago y movera el pedido a Pago. Confirma que monto y metodo son correctos.
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={pending} type="button" variant="secondary" onClick={() => setConfirmPaymentOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={pending} type="button" onClick={recordPayment}>
                <CreditCard className="h-4 w-4" />
                {pending ? "Registrando..." : "Confirmar pago"}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}

      {confirmTransitOpen ? (
        <ModalOverlay role="alertdialog">
          <div className="animate-pop w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-base font-semibold">Marcar en camino</h2>
              <p className="text-sm text-muted-foreground">
                Esto cambiara el pedido a Llegada y quedara listo para recepcion. Confirma que el estado logistico ya aplica.
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={pending} type="button" variant="secondary" onClick={() => setConfirmTransitOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={pending} type="button" onClick={markTransit}>
                <Truck className="h-4 w-4" />
                {pending ? "Actualizando..." : "Confirmar cambio"}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </div>
  );
}
