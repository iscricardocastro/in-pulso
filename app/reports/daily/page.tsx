import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  CalendarDays,
  CreditCard,
  HandCoins,
  ReceiptText,
  RotateCcw,
  TrendingUp,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatDate, money } from "@/lib/utils";
import { getDailySalesReport } from "@/services/reports";

type DailyReportPageProps = {
  searchParams: Promise<{ end?: string; start?: string }>;
};

type Tone = "blue" | "cyan" | "emerald" | "amber";

const toneClasses: Record<Tone, { bar: string; icon: string; panel: string; text: string }> = {
  amber: {
    bar: "bg-amber-500",
    icon: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    panel: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
  },
  blue: {
    bar: "bg-blue-600",
    icon: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    panel: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
  },
  cyan: {
    bar: "bg-cyan-600",
    icon: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    panel: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-300",
  },
  emerald: {
    bar: "bg-emerald-600",
    icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    panel: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
  },
};

export default async function DailyReportPage({ searchParams }: DailyReportPageProps) {
  const params = await searchParams;
  const report = await getDailySalesReport(params);
  const maxDailyTotal = Math.max(...report.salesByDay.map((day) => day.total), 1);
  const maxPaymentTotal = Math.max(...report.paymentMethods.map((method) => method.total), 1);
  const paidPercent = report.total > 0 ? Math.round((report.paid / report.total) * 100) : 0;
  const rangeLabel = report.range.startDate === report.range.endDate
    ? formatLongDate(report.range.startDate)
    : `${formatLongDate(report.range.startDate)} a ${formatLongDate(report.range.endDate)}`;

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm shadow-slate-950/[0.035]">
          <div className="border-b border-border/70 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-lg px-3 py-1.5" variant="secondary">
                    Reporte de caja
                  </Badge>
                  <Badge className="rounded-lg px-3 py-1.5" variant={report.pending > 0 ? "warning" : "success"}>
                    {rangeLabel}
                  </Badge>
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Reporte diario</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Caja, devoluciones y deudores del periodo.
                </p>
              </div>

              <form className="rounded-xl border border-border/80 bg-muted/30 p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,145px)_minmax(0,145px)_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="start">Inicio</Label>
                    <Input defaultValue={report.range.startDate} id="start" name="start" type="date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end">Fin</Label>
                    <Input defaultValue={report.range.endDate} id="end" name="end" type="date" />
                  </div>
                  <Button className="h-10" type="submit">
                    <CalendarDays className="h-4 w-4" />
                    Aplicar
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <QuickRangeLink href="/reports/daily" label="Hoy" />
                  <QuickRangeLink href={lastDaysHref(7)} label="7 dias" />
                </div>
              </form>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
            <CashSummaryLink
              detail={`Venta bruta ${money(report.grossTotal)}`}
              href="#ultimos-movimientos"
              icon={HandCoins}
              label="Tengo en caja"
              tone="emerald"
              value={money(report.paid)}
            />
            <CashSummaryLink
              detail={`${report.refundedSales.length} venta(s) con devolucion`}
              href="#devoluciones"
              icon={RotateCcw}
              label="Se devolvio"
              tone="amber"
              value={money(report.refundAmount)}
            />
            <CashSummaryLink
              detail="Diferencia a favor negocio"
              href="#devoluciones"
              icon={WalletCards}
              label="Retenido devolucion"
              tone="cyan"
              value={money(report.refundRetained)}
            />
            <CashSummaryLink
              detail={`${report.pendingCount} movimiento(s) con saldo`}
              href="#pendientes"
              icon={UsersRound}
              label="Pendientes"
              tone="blue"
              value={money(report.pending)}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard detail={`${report.salesCount} venta(s), ${report.notesCount} nota(s), ticket ${money(report.averageTicket)}`} icon={TrendingUp} label="Venta neta" max={report.grossTotal} tone="emerald" value={money(report.total)} width={report.grossTotal > 0 ? Math.round((report.total / report.grossTotal) * 100) : 0} />
          <MetricCard detail={`${report.paidCount} movimiento(s) cubiertos`} icon={CreditCard} label="Cobrado neto" max={report.total} tone="blue" value={money(report.paid)} width={paidPercent} />
          <MetricCard detail={`${report.refundValue > 0 ? `${money(report.refundValue)} valor piezas` : "Sin devoluciones"}`} icon={UsersRound} label="Devuelto" max={report.grossTotal} tone="amber" value={money(report.refundAmount)} width={report.grossTotal > 0 ? Math.round((report.refundAmount / report.grossTotal) * 100) : 0} />
          <MetricCard detail={report.refundExtra > 0 ? `${money(report.refundExtra)} extra devuelto` : "Diferencia a favor negocio"} icon={WalletCards} label="Retenido devolucion" max={report.grossTotal} tone="cyan" value={money(report.refundRetained)} width={report.grossTotal > 0 ? Math.round((report.refundRetained / report.grossTotal) * 100) : 0} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Venta por dia
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{rangeLabel}</p>
                </div>
                <Link className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80" href="/sales">
                  Abrir ventas
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid min-h-72 grid-cols-[repeat(auto-fit,minmax(64px,1fr))] items-end gap-3 rounded-xl bg-muted/30 p-3 ring-1 ring-border/60">
                {report.salesByDay.map((day) => {
                  const height = Math.max(7, Math.round((day.total / maxDailyTotal) * 100));
                  const paidHeight = day.total > 0 ? Math.max(0, Math.round((day.paid / day.total) * 100)) : 0;
                  const pendingHeight = Math.max(0, 100 - paidHeight);
                  return (
                    <div key={day.date} className="group flex min-w-0 flex-col items-center gap-2">
                      <div className="flex h-52 w-full items-end rounded-lg bg-card p-1 ring-1 ring-border/60">
                        {day.total > 0 ? (
                          <div
                            className="flex w-full flex-col justify-end overflow-hidden rounded-md transition-[height] duration-200"
                            style={{ height: `${height}%` }}
                            title={`${day.label}: ${money(day.total)}`}
                          >
                            <div className="w-full bg-amber-400/85" style={{ height: `${pendingHeight}%` }} />
                            <div className="w-full bg-primary/85 group-hover:bg-primary" style={{ height: `${paidHeight}%` }} />
                          </div>
                        ) : (
                          <div className="h-2 w-full rounded-md bg-muted-foreground/20" title={`${day.label}: ${money(day.total)}`} />
                        )}
                      </div>
                      <div className="w-full min-w-0 text-center">
                        <p className="truncate text-xs font-medium text-muted-foreground">{day.label}</p>
                        <p className="truncate text-xs font-semibold">{money(day.total)}</p>
                        <p className="text-[11px] text-muted-foreground">{day.count} movs.</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card id="pendientes">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <WalletCards className="h-5 w-5 text-primary" />
                Metodos de pago
              </CardTitle>
              <p className="text-sm text-muted-foreground">Importe cobrado por metodo.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.paymentMethods.length === 0 ? (
                <EmptyPanel icon={Banknote} title="Sin pagos" description="No hay cobros en este periodo." />
              ) : (
                report.paymentMethods.map((method) => {
                  const width = Math.max(8, Math.round((method.total / maxPaymentTotal) * 100));
                  return (
                    <div key={method.id} className="motion-list-item rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/35">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{method.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {method.count} pago(s){method.refundCount > 0 ? `, ${method.refundCount} devolucion(es)` : ""}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">{money(method.total)}</p>
                      </div>
                      {method.refunded > 0 ? (
                        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                          {money(method.refunded)} devuelto
                        </p>
                      ) : null}
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card id="devoluciones">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Devoluciones</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Ventas devueltas o parciales dentro del periodo.</p>
                </div>
                <Badge variant={report.refundAmount > 0 ? "warning" : "secondary"}>
                  {money(report.refundAmount)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.refundedSales.length === 0 ? (
                <EmptyPanel icon={RotateCcw} title="Sin devoluciones" description="No hubo devoluciones en este rango." />
              ) : (
                report.refundedSales.map((sale) => (
                  <SaleRow
                    key={sale.id}
                    badge={sale.refundRetained > 0 ? `Retenido ${money(sale.refundRetained)}` : "Devuelto"}
                    badgeVariant="warning"
                    customer={sale.customers?.name ?? "Venta mostrador"}
                    href={`/sales?detail=${sale.sale_number}` as Route}
                    saleNumber={sale.sale_number}
                    value={money(sale.refundAmount)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card id="ultimos-movimientos">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Pendientes</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Ventas y notas con saldo dentro del periodo.</p>
                </div>
                <Link className="text-sm font-medium text-primary transition-colors hover:text-primary/80" href="/debtors">
                  Ver deudores
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.topPending.length === 0 ? (
                <EmptyPanel icon={UsersRound} title="Sin pendientes" description="No quedaron saldos abiertos en este rango." />
              ) : (
                report.topPending.map((sale) => (
                  <SaleRow
                    key={sale.id}
                    badge={money(Number(sale.balance_due ?? 0))}
                    badgeVariant="warning"
                    customer={sale.customers?.name ?? "Venta mostrador"}
                    href={(sale.source === "note" ? "/service-notes" : `/debtors?sale=${sale.sale_number}`) as Route}
                    saleNumber={sale.sale_number}
                    value={formatDate(sale.created_at)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Ultimos movimientos</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Movimiento reciente del periodo.</p>
                </div>
                <Link className="text-sm font-medium text-primary transition-colors hover:text-primary/80" href="/sales">
                  Ventas
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.recentSales.length === 0 ? (
                <EmptyPanel icon={ReceiptText} title="Sin movimientos" description="No hay ventas ni notas en este rango." />
              ) : (
                report.recentSales.map((sale) => (
                  <SaleRow
                    key={sale.id}
                    badge={sale.source === "note" ? "Nota" : sale.refundAmount > 0 ? "Con devolucion" : sale.balance_due > 0 ? "Pendiente" : "Pagada"}
                    badgeVariant={sale.refundAmount > 0 || sale.balance_due > 0 ? "warning" : "success"}
                    customer={sale.customers?.name ?? (sale.source === "note" ? "Nota" : "Venta mostrador")}
                    href={(sale.source === "note" ? "/service-notes" : `/sales?detail=${sale.sale_number}`) as Route}
                    saleNumber={sale.sale_number}
                    value={money(Math.max(0, Number(sale.total ?? 0) - sale.refundAmount))}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  max,
  tone,
  value,
  width,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  max: number;
  tone: Tone;
  value: string;
  width?: number;
}) {
  const progress = width ?? (max > 0 ? 100 : 0);

  return (
    <Card className={cn("motion-surface overflow-hidden", toneClasses[tone].panel)}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneClasses[tone].icon)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-card ring-1 ring-border/50">
          <div className={cn("h-full rounded-full", toneClasses[tone].bar)} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function CashSummaryLink({
  detail,
  href,
  icon: Icon,
  label,
  tone,
  value,
}: {
  detail: string;
  href: Route | `#${string}`;
  icon: LucideIcon;
  label: string;
  tone: Tone;
  value: string;
}) {
  return (
    <Link
      className={cn(
        "motion-surface block rounded-xl border border-border/70 bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        toneClasses[tone].panel,
      )}
      href={href}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", toneClasses[tone].text)}>{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClasses[tone].icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function QuickRangeLink({ href, label }: { href: Route; label: string }) {
  return (
    <Link
      className="motion-press inline-flex h-9 items-center justify-center rounded-lg border border-border/80 bg-card px-3 text-sm font-medium hover:border-primary/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      {label}
    </Link>
  );
}

function SaleRow({
  badge,
  badgeVariant,
  customer,
  href,
  saleNumber,
  value,
}: {
  badge: string;
  badgeVariant: "success" | "warning";
  customer: string;
  href: Route;
  saleNumber: string;
  value: string;
}) {
  return (
    <Link
      className="motion-list-item flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{saleNumber}</p>
        <p className="truncate text-sm text-muted-foreground">{customer}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold">{value}</p>
        <Badge variant={badgeVariant}>{badge}</Badge>
      </div>
    </Link>
  );
}

function EmptyPanel({ description, icon: Icon, title }: { description: string; icon: LucideIcon; title: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border p-4 text-center">
      <Icon className="mb-2 h-6 w-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function lastDaysHref(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return `/reports/daily?start=${toInputDate(start)}&end=${toInputDate(end)}` as Route;
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
