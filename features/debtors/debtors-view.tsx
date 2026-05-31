"use client";

import { CreditCard, Eye, Save, UsersRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, money } from "@/lib/utils";
import { createCatalogItem } from "@/services/catalogs";
import { type DebtorSummary, recordDebtPayment } from "@/services/debtors";
import type { CatalogItem, CustomerDebt } from "@/types/database";

export function DebtorsView({ debtors, paymentMethods }: { debtors: DebtorSummary[]; paymentMethods: CatalogItem[] }) {
  const [selected, setSelected] = useState<DebtorSummary | null>(debtors[0] ?? null);
  const [paying, setPaying] = useState<CustomerDebt | null>(null);
  const total = debtors.reduce((sum, debtor) => sum + debtor.total_balance, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deudores</h1>
          <p className="text-sm text-muted-foreground">Clientes con ventas pendientes y abonos a cuenta.</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="text-muted-foreground">Saldo abierto </span>
          <span className="font-semibold">{money(total)}</span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {debtors.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
                <UsersRound className="mb-2 h-6 w-6" />
                Sin deudas abiertas.
              </div>
            ) : (
              <div className="space-y-2">
                {debtors.map((debtor) => (
                  <button
                    key={debtor.customer_id}
                    className={selected?.customer_id === debtor.customer_id ? "w-full cursor-pointer rounded-lg border border-primary bg-accent p-3 text-left" : "w-full cursor-pointer rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"}
                    type="button"
                    onClick={() => setSelected(debtor)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{debtor.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{debtor.debts.length} venta(s) pendiente(s)</p>
                      </div>
                      <Badge variant="warning">{money(debtor.total_balance)}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalle</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
                <Eye className="mb-2 h-6 w-6" />
                Selecciona cliente.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div>
                    <p className="font-semibold">{selected.customer_name}</p>
                    <p className="text-sm text-muted-foreground">{[selected.phone, selected.email].filter(Boolean).join(" · ") || "Sin contacto"}</p>
                  </div>
                  <Badge variant="warning">{money(selected.total_balance)}</Badge>
                </div>

                <div className="space-y-3">
                  {selected.debts.map((debt) => (
                    <div key={debt.id} className="rounded-lg border border-border p-3">
                      <div className="grid gap-3 md:grid-cols-[1fr_130px_130px_120px] md:items-center">
                        <div>
                          <p className="font-medium">{debt.sales?.sale_number ?? "Venta"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(debt.created_at)}</p>
                        </div>
                        <SummaryMini label="Total" value={money(debt.original_amount)} />
                        <SummaryMini label="Abonado" value={money(debt.paid_amount)} />
                        <div className="flex items-center justify-between gap-2 md:justify-end">
                          <Badge variant="warning">{money(debt.balance)}</Badge>
                          <Button size="sm" type="button" onClick={() => setPaying(debt)}>
                            <CreditCard className="h-4 w-4" />
                            Abonar
                          </Button>
                        </div>
                      </div>
                      {debt.payments && debt.payments.length > 0 ? (
                        <div className="mt-3 space-y-1 border-t border-border pt-3">
                          {debt.payments.map((payment) => (
                            <p key={payment.id} className="text-xs text-muted-foreground">
                              {formatDate(payment.created_at)} · {payment.payment_method_name} · {money(payment.amount)}
                              {payment.comments ? ` · ${payment.comments}` : ""}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {paying ? (
        <DebtPaymentPanel
          debt={paying}
          paymentMethods={paymentMethods}
          onClose={() => setPaying(null)}
        />
      ) : null}
    </div>
  );
}

function DebtPaymentPanel({ debt, paymentMethods, onClose }: { debt: CustomerDebt; paymentMethods: CatalogItem[]; onClose: () => void }) {
  const router = useRouter();
  const [paymentOptions, setPaymentOptions] = useState(paymentMethods);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [comments, setComments] = useState("");
  const [pending, startTransition] = useTransition();
  const numericAmount = parseMoneyInput(amount);

  function submit() {
    startTransition(async () => {
      try {
        await recordDebtPayment({
          debt_id: debt.id,
          payment_method_id: paymentMethodId,
          amount: numericAmount,
          comments,
        });
        toast.success("Abono registrado");
        onClose();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar abono");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Abonar a {debt.sales?.sale_number ?? "venta"}</CardTitle>
          <Button size="icon" type="button" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_160px_1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label>Metodo de pago</Label>
          <CreatableCombobox
            emptyLabel="Sin metodos"
            options={paymentOptions.map((method) => ({ id: method.id, name: method.name }))}
            placeholder="Buscar metodo"
            selectedValue={paymentMethodId}
            value={paymentOptions.find((method) => method.id === paymentMethodId)?.name ?? ""}
            valueMode="id"
            onChange={setPaymentMethodId}
            onCreate={async (name) => {
              const created = await createCatalogItem("payment_method", name);
              setPaymentOptions((current) => [...current, created]);
              return { id: created.id, name: created.name };
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Monto</Label>
          <MoneyInput value={amount} onChange={setAmount} />
        </div>
        <div className="space-y-2">
          <Label>Comentario</Label>
          <Input value={comments} onChange={(event) => setComments(event.target.value)} />
        </div>
        <Button disabled={pending || !paymentMethodId || numericAmount <= 0 || numericAmount > debt.balance} type="button" onClick={submit}>
          <Save className="h-4 w-4" />
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function MoneyInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input
        className="pl-7"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(cleanMoneyInput(event.target.value))}
        onFocus={(event) => window.setTimeout(() => event.currentTarget.select(), 0)}
      />
    </div>
  );
}

function cleanMoneyInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

function parseMoneyInput(value: string) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}
