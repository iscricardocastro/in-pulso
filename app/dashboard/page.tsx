import Link from "next/link";
import type { Route } from "next";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  ClipboardList,
  CreditCard,
  PackageMinus,
  PackageX,
  ReceiptText,
  TrendingUp,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { productModel } from "@/lib/catalog-display";
import { cn, formatDate, money } from "@/lib/utils";
import { getDashboardData } from "@/services/dashboard";

type MetricCard = {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
  tone: "warning" | "destructive" | "default" | "success" | "info";
  href?: Route;
  action?: string;
};

const toneClasses: Record<MetricCard["tone"], string> = {
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  destructive: "bg-red-500/10 text-red-700 dark:text-red-300",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  info: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  default: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

const toneIconClasses: Record<MetricCard["tone"], string> = {
  warning: "text-amber-700 dark:text-amber-300",
  destructive: "text-red-700 dark:text-red-300",
  success: "text-emerald-700 dark:text-emerald-300",
  info: "text-cyan-700 dark:text-cyan-300",
  default: "text-blue-700 dark:text-blue-300",
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  const maxDailySales = Math.max(...data.weeklySalesByDay.map((day) => day.total), 1);
  const weekLabel = `${shortDate(data.weekRange.start)} - ${shortDate(data.weekRange.end)}`;

  const cards: MetricCard[] = [
    {
      label: "Ventas semana",
      value: money(data.stats.weeklySales),
      detail: `${data.stats.weeklySalesCount} ventas del rango`,
      icon: TrendingUp,
      tone: "success",
      href: "/sales",
      action: "Abrir ventas",
    },
    {
      label: "Cobrado semana",
      value: money(data.stats.weeklyPaid),
      detail: `${money(data.stats.weeklyBalanceDue)} quedo pendiente`,
      icon: CreditCard,
      tone: "default",
      href: "/sales",
      action: "Revisar cobros",
    },
    {
      label: "Deuda abierta",
      value: money(data.stats.openDebt),
      detail: `${data.stats.debtorCount} clientes, ${data.stats.openDebtCount} ventas`,
      icon: UsersRound,
      tone: data.stats.openDebt > 0 ? "warning" : "success",
      href: "/debtors",
      action: "Gestionar deudores",
    },
    {
      label: "Valor inventario",
      value: money(data.stats.inventoryValue),
      detail: `${data.stats.needsReview} piezas requieren revision`,
      icon: Wallet,
      tone: "info",
      href: "/products?stock=low",
      action: "Revisar stock",
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard operativo</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Ventas generadas, deudores y alertas para decidir que atender ahora.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-lg px-3 py-2 text-sm">
              Semana {weekLabel}
            </Badge>
            <Link
              className="motion-press inline-flex h-9 items-center gap-2 rounded-lg border border-border/80 bg-card px-3 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/reports/daily"
            >
              <BarChart3 className="h-4 w-4" />
              Reporte diario
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <MetricLinkCard key={card.label} card={card} />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Ventas por dia</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{weekLabel}</p>
                </div>
                <Link className="text-sm font-medium text-primary transition-colors hover:text-primary/80" href="/sales">
                  Ver historial
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid min-h-64 grid-cols-7 items-end gap-2 sm:gap-3">
                {data.weeklySalesByDay.map((day) => {
                  const height = Math.max(8, Math.round((day.total / maxDailySales) * 100));
                  return (
                    <div key={day.date} className="flex min-w-0 flex-col items-center gap-2">
                      <div className="flex h-44 w-full items-end rounded-lg bg-muted/50 p-1 ring-1 ring-border/60">
                        <div
                          className={cn(
                            "w-full rounded-md bg-primary/75 transition-all duration-200",
                            day.total === 0 && "bg-muted-foreground/20",
                          )}
                          style={{ height: `${height}%` }}
                          title={`${day.label}: ${money(day.total)}`}
                        />
                      </div>
                      <div className="w-full min-w-0 text-center">
                        <p className="truncate text-xs font-medium capitalize text-muted-foreground">{day.label}</p>
                        <p className="truncate text-xs font-semibold">{money(day.total)}</p>
                        <p className="text-[11px] text-muted-foreground">{day.count} ventas</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Deudores prioritarios</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Ordenados por saldo abierto.</p>
                </div>
                <Link className="text-sm font-medium text-primary transition-colors hover:text-primary/80" href="/debtors">
                  Ver todos
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.debtors.length === 0 ? (
                <EmptyState icon={UsersRound} title="Sin deudas abiertas" description="Las ventas a credito apareceran aqui." />
              ) : (
                data.debtors.map((debtor) => (
                  <Link
                    key={debtor.customer_id}
                    className="motion-list-item flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={`/debtors?customer=${debtor.customer_id}` as Route}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{debtor.customer_name}</p>
                      <p className="truncate text-sm text-muted-foreground">{debtor.phone || "Sin telefono"} · {debtor.debt_count} ventas</p>
                    </div>
                    <Badge variant="warning" className="shrink-0">
                      {money(debtor.total_balance)}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Ventas recientes</CardTitle>
                <Link className="text-sm font-medium text-primary transition-colors hover:text-primary/80" href="/sales">
                  Abrir ventas
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.weeklySales.length === 0 ? (
                <EmptyState icon={ReceiptText} title="Sin ventas esta semana" description="Registra una venta para iniciar el corte semanal." />
              ) : (
                data.weeklySales.map((sale) => (
                  <div key={sale.id} className="motion-list-item flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/45">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{sale.sale_number}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {sale.customers?.name || "Venta mostrador"} · {formatDate(sale.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{money(sale.total)}</p>
                      <Badge variant={sale.balance_due > 0 ? "warning" : "success"}>
                        {sale.balance_due > 0 ? "Con deuda" : "Pagada"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Alertas de inventario</CardTitle>
                <Link className="text-sm font-medium text-primary transition-colors hover:text-primary/80" href="/products?stock=low">
                  Ver productos
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatusTile icon={PackageMinus} label="Stock bajo" value={data.stats.lowStock} tone="warning" />
                <StatusTile icon={PackageX} label="Agotadas" value={data.stats.outOfStock} tone="destructive" />
                <StatusTile icon={CalendarClock} label="Llegadas" value={data.stats.expectedArrivals} tone="info" />
              </div>

              {data.lowStockProducts.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="Sin alertas abiertas" description="Las piezas estan sobre su minimo configurado." />
              ) : (
                data.lowStockProducts.slice(0, 5).map((product) => (
                  <Link
                    key={product.id}
                    className="motion-list-item flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={product.current_stock === 0 ? "/products?stock=out" : "/products?stock=low"}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {product.internal_code} · {productModel(product) || "Sin modelo"}
                      </p>
                    </div>
                    <Badge className="shrink-0" variant={product.current_stock === 0 ? "destructive" : "warning"}>
                      {product.current_stock}/{product.minimum_stock}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos proximos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.upcomingOrders.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Sin llegadas proximas" description="Crea pedidos para ver vencimientos de recepcion." />
              ) : (
                data.upcomingOrders.map((order) => (
                  <Link
                    key={order.id}
                    className="motion-list-item flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={order.status === "in_transit" ? "/purchase-orders?status=in_transit" : "/purchase-orders?arrival=soon"}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{order.order_number}</p>
                      <p className="truncate text-sm text-muted-foreground">{order.supplier || "Sin proveedor"}</p>
                    </div>
                    <Badge className="shrink-0">{formatDate(order.expected_arrival)}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ultimos movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.movements.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Sin movimientos" description="Registra entradas, salidas o ajustes para crear historial." />
              ) : (
                data.movements.slice(0, 6).map((movement) => (
                  <div key={movement.id} className="motion-list-item flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/45">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{movement.products?.name || "Producto"}</p>
                      <p className="truncate text-sm text-muted-foreground">{formatDate(movement.created_at)}</p>
                    </div>
                    <Badge className="shrink-0" variant={movement.type === "exit" ? "destructive" : "success"}>
                      {movementLabel(movement.type)} · {movement.quantity}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function MetricLinkCard({ card }: { card: MetricCard }) {
  const content = (
    <Card className={cn("h-full overflow-hidden", card.href && "motion-surface cursor-pointer hover:bg-accent/35")}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneClasses[card.tone])}>
          <card.icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-semibold tracking-tight">{card.value}</div>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">{card.detail}</p>
          {card.action ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
              {card.action}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  if (!card.href) return <div>{content}</div>;

  return (
    <Link className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={card.href}>
      {content}
    </Link>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: MetricCard["tone"];
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={cn("h-4 w-4", toneIconClasses[tone])} />
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function movementLabel(type: string) {
  if (type === "exit") return "Salida";
  if (type === "entry") return "Entrada";
  return "Ajuste";
}
