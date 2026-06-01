"use client";

import { CheckCircle2, CreditCard, Eye, Save, UsersRound, X } from "lucide-react";
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

type PaymentDraft = {
  debt: CustomerDebt;
  initialAmount: string;
};

type PaymentState = PaymentDraft | CustomerDebt;

export function DebtorsView({
  debtors,
  initialCustomerId,
  initialSaleNumber,
  paymentMethods,
}: {
  debtors: DebtorSummary[];
  initialCustomerId?: string;
  initialSaleNumber?: string;
  paymentMethods: CatalogItem[];
}) {
  const [visibleDebtors, setVisibleDebtors] = useState(debtors);
  const [selected, setSelected] = useState<DebtorSummary | null>(() => findInitialDebtor(debtors, initialCustomerId, initialSaleNumber));
  const [paying, setPaying] = useState<PaymentState | null>(null);
  const total = visibleDebtors.reduce((sum, debtor) => sum + debtor.total_balance, 0);
  const paymentDraft = paying ? normalizePaymentDraft(paying) : null;

  function applyPayment(debtId: string, amount: number) {
    const next = updateDebtorsAfterPayment(visibleDebtors, debtId, amount);
    const nextSelected = selected ? next.find((debtor) => debtor.customer_id === selected.customer_id) ?? next[0] ?? null : next[0] ?? null;
    setVisibleDebtors(next);
    setSelected(nextSelected);
    setPaying(null);
  }

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
            {visibleDebtors.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
                <UsersRound className="mb-2 h-6 w-6" />
                Sin deudas abiertas.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleDebtors.map((debtor) => (
                  <button
                    key={debtor.customer_id}
                    className={selected?.customer_id === debtor.customer_id ? "w-full cursor-pointer rounded-lg border border-primary bg-accent p-3 text-left" : "w-full cursor-pointer rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"}
                    type="button"
                    onClick={() => {
                      setSelected(debtor);
                      setPaying(null);
                    }}
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

                {paymentDraft ? (
                  <DebtPaymentPanel
                    key={`${paymentDraft.debt.id}:${paymentDraft.initialAmount}`}
                    debt={paymentDraft.debt}
                    initialAmount={paymentDraft.initialAmount}
                    paymentMethods={paymentMethods}
                    onClose={() => setPaying(null)}
                    onSaved={applyPayment}
                  />
                ) : null}

                <div className="space-y-3">
                  {selected.debts.map((debt) => {
                    const highlighted = debt.sales?.sale_number === initialSaleNumber;

                    return (
                    <div
                      key={debt.id}
                      className={highlighted ? "rounded-lg border border-primary bg-accent p-3" : "rounded-lg border border-border p-3"}
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr_130px_130px_120px] md:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{debt.sales?.sale_number ?? "Venta"}</p>
                            {highlighted ? <Badge variant="secondary">Seleccionada</Badge> : null}
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(debt.created_at)}</p>
                        </div>
                        <SummaryMini label="Total" value={money(debt.original_amount)} />
                        <SummaryMini label="Abonado" value={money(debt.paid_amount)} />
                        <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
                          <Badge variant="warning">{money(debt.balance)}</Badge>
                          <Button size="sm" type="button" onClick={() => setPaying({ debt, initialAmount: "" })}>
                            <CreditCard className="h-4 w-4" />
                            Abonar
                          </Button>
                          <Button size="sm" type="button" variant="secondary" onClick={() => setPaying({ debt, initialAmount: String(debt.balance) })}>
                            <CheckCircle2 className="h-4 w-4" />
                            Saldar
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
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function DebtPaymentPanel({
  debt,
  initialAmount,
  paymentMethods,
  onClose,
  onSaved,
}: {
  debt: CustomerDebt;
  initialAmount: string;
  paymentMethods: CatalogItem[];
  onClose: () => void;
  onSaved: (debtId: string, amount: number) => void;
}) {
  const router = useRouter();
  const [paymentOptions, setPaymentOptions] = useState(paymentMethods);
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods.length === 1 ? paymentMethods[0].id : "");
  const [amount, setAmount] = useState(initialAmount);
  const [comments, setComments] = useState("");
  const [pending, startTransition] = useTransition();
  const numericAmount = parseMoneyInput(amount);
  const remainingBalance = Math.max(0, debt.balance - numericAmount);
  const isSettling = numericAmount === debt.balance;
  const hasInvalidAmount = numericAmount <= 0 || numericAmount > debt.balance;

  function submit() {
    startTransition(async () => {
      try {
        await recordDebtPayment({
          debt_id: debt.id,
          payment_method_id: paymentMethodId,
          amount: numericAmount,
          comments,
        });
        toast.success(isSettling ? "Deuda saldada" : "Abono registrado");
        onSaved(debt.id, numericAmount);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar abono");
      }
    });
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-accent/60 p-3">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{isSettling ? "Saldar deuda" : "Registrar abono"}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {debt.sales?.sale_number ?? "Venta"} · saldo {money(debt.balance)}
            </p>
          </div>
          <Button size="icon" type="button" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <DebtPaymentMetric label="Saldo actual" value={money(debt.balance)} />
          <DebtPaymentMetric label="Abono" value={money(numericAmount)} />
          <DebtPaymentMetric label="Quedaria" value={money(remainingBalance)} />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button size="sm" type="button" variant={isSettling ? "default" : "secondary"} onClick={() => setAmount(String(debt.balance))}>
            <CheckCircle2 className="h-4 w-4" />
            Saldar total
          </Button>
          <Button size="sm" type="button" variant="secondary" onClick={() => setAmount(String(roundMoney(debt.balance / 2)))}>
            Mitad
          </Button>
          <Button size="sm" type="button" variant="ghost" onClick={() => setAmount("")}>
            Limpiar monto
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_160px] md:items-end">
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
        </div>

        <details className="group rounded-lg border border-border bg-card/80 p-3">
          <summary className="cursor-pointer text-sm font-medium outline-none transition-colors group-open:mb-3 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
            Comentario opcional
          </summary>
          <Input value={comments} onChange={(event) => setComments(event.target.value)} />
        </details>

        {numericAmount > debt.balance ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            El abono no puede superar el saldo pendiente.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={pending} type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={pending || !paymentMethodId || hasInvalidAmount} type="button" onClick={submit}>
            <Save className="h-4 w-4" />
            {pending ? "Guardando..." : isSettling ? "Saldar deuda" : "Registrar abono"}
          </Button>
        </div>
      </CardContent>
    </div>
  );
}

function DebtPaymentMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
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

function findInitialDebtor(debtors: DebtorSummary[], customerId?: string, saleNumber?: string) {
  if (customerId) {
    const byCustomer = debtors.find((debtor) => debtor.customer_id === customerId);
    if (byCustomer) return byCustomer;
  }

  if (saleNumber) {
    const bySale = debtors.find((debtor) => debtor.debts.some((debt) => debt.sales?.sale_number === saleNumber));
    if (bySale) return bySale;
  }

  return debtors[0] ?? null;
}

function normalizePaymentDraft(paying: PaymentState): PaymentDraft | null {
  if ("debt" in paying) return paying.debt ? paying : null;
  return paying.id ? { debt: paying, initialAmount: "" } : null;
}

function updateDebtorsAfterPayment(debtors: DebtorSummary[], debtId: string, amount: number) {
  return debtors
    .map((debtor) => {
      const debts = debtor.debts
        .map((debt) => {
          if (debt.id !== debtId) return debt;
          const paidAmount = roundMoney(debt.paid_amount + amount);
          const balance = roundMoney(Math.max(0, debt.balance - amount));
          return {
            ...debt,
            paid_amount: paidAmount,
            balance,
            status: balance <= 0 ? "paid" : "open",
          } satisfies CustomerDebt;
        })
        .filter((debt) => debt.balance > 0 && debt.status === "open");

      return {
        ...debtor,
        debts,
        total_balance: roundMoney(debts.reduce((sum, debt) => sum + debt.balance, 0)),
      };
    })
    .filter((debtor) => debtor.debts.length > 0 && debtor.total_balance > 0);
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
        onFocus={(event) => {
          const input = event.currentTarget;
          window.setTimeout(() => input.select(), 0);
        }}
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

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
