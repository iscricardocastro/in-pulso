import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  PackageMinus,
  PackageX,
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
  icon: LucideIcon;
  tone: "warning" | "destructive" | "default" | "success" | "info";
  href?: Route;
  action?: string;
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  const cards: MetricCard[] = [
    { label: "Piezas con stock bajo", value: data.stats.lowStock, icon: PackageMinus, tone: "warning", href: "/products?stock=low", action: "Ver productos" },
    { label: "Piezas agotadas", value: data.stats.outOfStock, icon: PackageX, tone: "destructive", href: "/products?stock=out", action: "Ver agotados" },
    { label: "Pedidos en transito", value: data.stats.inTransitOrders, icon: ClipboardList, tone: "default", href: "/purchase-orders?status=in_transit", action: "Ver pedidos" },
    { label: "Valor total inventario", value: money(data.stats.inventoryValue), icon: Wallet, tone: "success" },
    { label: "Llegadas esperadas", value: data.stats.expectedArrivals, icon: CalendarClock, tone: "info", href: "/purchase-orders?arrival=soon", action: "Ver llegadas" },
  ];

  return (
    <AppShell>
      <div className="space-y-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Hoy en inventario</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Prioridades abiertas para surtido, recepcion y control de piezas.
            </p>
          </div>
          <div className="animate-enter rounded-lg border border-border/80 bg-card px-3 py-2 text-sm text-muted-foreground">
            {data.stats.needsReview} piezas requieren revision
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => {
            const content = (
              <Card
                className={cn(
                  "h-full overflow-hidden",
                  card.href && "motion-surface cursor-pointer hover:bg-accent/35",
                )}
              >
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      card.tone === "warning" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                      card.tone === "destructive" && "bg-red-500/10 text-red-700 dark:text-red-300",
                      card.tone === "success" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      card.tone === "info" && "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
                      card.tone === "default" && "bg-blue-500/10 text-blue-700 dark:text-blue-300",
                    )}
                  >
                    <card.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-semibold">{card.value}</div>
                  {card.href ? (
                    <div className="flex items-center gap-1 text-xs font-medium text-primary">
                      {card.action}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Costo por stock actual</div>
                  )}
                </CardContent>
              </Card>
            );

            return card.href ? (
              <Link key={card.label} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={card.href}>
                {content}
              </Link>
            ) : (
              <div key={card.label}>{content}</div>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Stock bajo</CardTitle>
                <Link className="text-sm font-medium text-primary transition-colors hover:text-primary/80" href="/products?stock=low">
                  Ver todos
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.lowStockProducts.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="Sin alertas abiertas" description="Las piezas estan sobre su minimo configurado." />
              ) : (
                data.lowStockProducts.map((product) => (
                  <Link
                    key={product.id}
                    className="motion-list-item flex cursor-pointer items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={product.current_stock === 0 ? "/products?stock=out" : "/products?stock=low"}
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.internal_code} · {productModel(product) || "Sin modelo"}
                      </p>
                    </div>
                    <Badge variant={product.current_stock === 0 ? "destructive" : "warning"}>
                      {product.current_stock}/{product.minimum_stock}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Pedidos proximos</CardTitle>
                <Link className="text-sm font-medium text-primary transition-colors hover:text-primary/80" href="/purchase-orders?arrival=soon">
                  Ver llegadas
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.upcomingOrders.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Sin llegadas proximas" description="Crea pedidos para ver vencimientos de recepcion." />
              ) : (
                data.upcomingOrders.map((order) => (
                  <Link
                    key={order.id}
                    className="motion-list-item flex cursor-pointer items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-3 hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href={order.status === "in_transit" ? "/purchase-orders?status=in_transit" : "/purchase-orders?arrival=soon"}
                  >
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{order.supplier || "Sin proveedor"}</p>
                    </div>
                    <Badge>{formatDate(order.expected_arrival)}</Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ultimos movimientos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.movements.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Sin movimientos" description="Registra entradas, salidas o ajustes para crear historial." />
              ) : (
                data.movements.map((movement) => (
                  <div key={movement.id} className="motion-list-item flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3 hover:bg-accent/45">
                    <div>
                      <p className="font-medium">{movement.products?.name || "Producto"}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(movement.created_at)}</p>
                    </div>
                    <Badge variant={movement.type === "exit" ? "destructive" : "success"}>
                      {movement.type} · {movement.quantity}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos con mayor movimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.highMovement.map((product) => (
                <div key={product.id} className="motion-list-item flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3 hover:bg-accent/45">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.internal_code}</p>
                  </div>
                  <Badge variant={product.current_stock <= product.minimum_stock ? "warning" : "success"}>
                    Stock {product.current_stock}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
