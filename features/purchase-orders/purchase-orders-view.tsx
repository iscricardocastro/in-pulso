"use client";

import { addDays, startOfDay } from "date-fns";
import { ArrowRight, CalendarClock, CheckCircle2, ClipboardList, CreditCard, History, PackageCheck, Plus, Search, Truck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PurchaseOrderActions } from "@/features/purchase-orders/purchase-order-actions";
import { PurchaseOrderForm } from "@/features/purchase-orders/purchase-order-form";
import { PurchaseOrderStatusPanel } from "@/features/purchase-orders/purchase-order-status-panel";
import { ReceiveOrderForm } from "@/features/purchase-orders/receive-order-form";
import type { PurchaseOrderFormValues } from "@/features/purchase-orders/schemas";
import { useFormReveal } from "@/hooks/use-form-reveal";
import { cn, formatDate, money } from "@/lib/utils";
import type { CatalogItem, Product, PurchaseOrder, PurchaseOrderEvent, Supplier } from "@/types/database";

type OrderStage = "all" | "planning" | "payment" | "transit" | "received" | "canceled";
type Icon = typeof ClipboardList;

export function PurchaseOrdersView({
  products,
  suppliers,
  orders,
  catalogs,
  statusFilter,
  arrivalFilter,
  stageFilter: initialStageFilter,
  createMode,
}: {
  products: Product[];
  suppliers: Supplier[];
  orders: PurchaseOrder[];
  catalogs: CatalogItem[];
  statusFilter?: string;
  arrivalFilter?: string;
  stageFilter?: string;
  createMode?: string;
}) {
  const router = useRouter();
  const lowStockOrderValues = createMode === "low-stock" ? buildLowStockOrderValues(products) : null;
  const [showCreate, setShowCreate] = useState(orders.length === 0 || Boolean(lowStockOrderValues));
  const [stageFilter, setStageFilter] = useState<OrderStage>(parseStageFilter(initialStageFilter));
  const [searchQuery, setSearchQuery] = useState("");
  const { formRef, revealForm } = useFormReveal<HTMLDivElement>();
  const activeStatusFilter = statusFilter === "in_transit" ? statusFilter : null;
  const activeArrivalFilter = arrivalFilter === "soon" ? arrivalFilter : null;
  const today = startOfDay(new Date());
  const soon = addDays(today, 7);
  const filteredByUrl = orders.filter((order) => {
    if (activeStatusFilter && order.status !== activeStatusFilter) return false;
    if (activeArrivalFilter) {
      if (!order.expected_arrival || !["paid", "in_transit"].includes(order.status)) return false;
      const arrival = startOfDay(new Date(order.expected_arrival));
      return arrival >= today && arrival <= soon;
    }
    return true;
  });
  const searchedOrders = filterOrdersBySearch(filteredByUrl, searchQuery);
  const filteredOrders = searchedOrders.filter((order) => stageFilter === "all" || orderStage(order) === stageFilter);
  const stageOptions = buildStageOptions(searchedOrders);
  const totals = buildTotals(searchedOrders, today, soon);
  const filterLabel = activeStatusFilter ? "En transito" : activeArrivalFilter ? "Llegadas esperadas" : null;
  const emptyFilterTitle = activeStatusFilter ? "Sin pedidos en transito" : "Sin llegadas esperadas";
  const handleStageChange = (stage: OrderStage) => {
    setStageFilter(stage);
    router.replace(`/purchase-orders?stage=${stage}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos y recepcion</h1>
          <p className="text-sm text-muted-foreground">
            {filterLabel ? `${filterLabel}: ${filteredOrders.length} pedidos.` : "Sigue cada compra desde pedido hasta inventario actualizado."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {filterLabel ? (
            <Button asChild variant="outline">
              <Link href="/purchase-orders">
                <X className="h-4 w-4" />
                Quitar filtro
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant={showCreate ? "secondary" : "default"}
            onClick={() => {
              setShowCreate((value) => !value);
              if (!showCreate) revealForm();
            }}
          >
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? "Cerrar" : "Nuevo pedido"}
          </Button>
        </div>
      </div>

      {showCreate ? (
        <Card ref={formRef} className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Crear pedido</CardTitle>
            <CardDescription>Captura proveedor, fecha esperada y productos. Despues podras puntear recepcion cuando llegue mercancia.</CardDescription>
          </CardHeader>
          <CardContent>
            <PurchaseOrderForm
              products={products}
              suppliers={suppliers}
              initialValues={lowStockOrderValues ?? undefined}
              onCancel={() => setShowCreate(false)}
              onSaved={() => {
                setShowCreate(false);
                handleStageChange("planning");
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile icon={ClipboardList} label="Pedidos activos" value={totals.active} />
        <SummaryTile icon={CreditCard} label="En pago" value={totals.payment} />
        <SummaryTile icon={Truck} label="En camino" value={totals.transit} />
        <SummaryTile icon={CalendarClock} label="Llegan pronto" value={totals.soon} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:max-w-md lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar por pedido, proveedor o fecha"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {stageOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              type="button"
              variant={stageFilter === option.value ? "default" : "outline"}
              onClick={() => setStageFilter(option.value)}
            >
              {option.label}
              <span className="ml-1 rounded-full bg-background/20 px-1.5 text-xs">{option.count}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-5">
              <EmptyState
                icon={ClipboardList}
                title={filterLabel ? emptyFilterTitle : stageFilter === "all" ? "Sin pedidos" : "Sin pedidos en esta etapa"}
                description={filterLabel ? "No hay pedidos que coincidan con este filtro." : "Crea el primer pedido para controlar compra, llegada y recepcion."}
              />
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const progress = orderProgress(order);
            const stage = orderStage(order);
            const closedIncomplete = order.status === "received" && progress.missing > 0;
            const balance = Math.max(0, Number(order.estimated_total) - Number(order.advance_paid));
            return (
              <Card key={order.id} className={cn("motion-surface", (stage === "received" || stage === "canceled") && "bg-muted/35")}>
                <CardHeader className="gap-3 pb-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start justify-between gap-3 lg:flex-1">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle>{order.order_number}</CardTitle>
                          <Badge variant={closedIncomplete ? "warning" : statusVariant(order.status)}>
                            {closedIncomplete ? "Cerrado incompleto" : statusLabels[order.status]}
                          </Badge>
                        </div>
                        <CardDescription>
                          {order.suppliers?.name || order.supplier || "Sin proveedor"} · Llega {formatDate(order.expected_arrival)}
                        </CardDescription>
                      </div>
                      <PurchaseOrderActions order={order} onStageChange={handleStageChange} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm lg:min-w-[330px]">
                      <Metric label="Total" value={money(order.estimated_total)} />
                      <Metric label="Pagado" value={money(order.advance_paid)} />
                      <Metric label="Saldo" value={money(balance)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-center">
                    <div>
                      <p className="text-sm font-medium">{nextAction(order, progress.missing)}</p>
                      <p className="text-sm text-muted-foreground">
                        {progress.received} de {progress.requested} piezas recibidas. Faltan {progress.missing}.
                      </p>
                      {closedIncomplete && order.notes ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">Evidencia: {order.notes}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Avance recepcion</span>
                        <span>{progress.percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress.percent}%` }} />
                      </div>
                    </div>
                  </div>

                  <details className="motion-panel group rounded-lg border border-border/70 bg-muted/20">
                    <summary className="motion-press flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-medium transition-colors hover:bg-accent/45">
                      <span>Gestionar pedido</span>
                      <span className="text-xs text-muted-foreground group-open:hidden">Abrir</span>
                      <span className="hidden text-xs text-muted-foreground group-open:inline">Cerrar</span>
                    </summary>
                    <div className="space-y-4 border-t border-border/70 p-3">
                      <WorkflowSteps stage={stage} />
                      <PurchaseOrderStatusPanel catalogs={catalogs} order={order} onStageChange={handleStageChange} />
                      <details className="motion-panel group rounded-lg border border-border/70 bg-background/60">
                        <summary className="motion-press flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-medium transition-colors hover:bg-accent/45">
                          <span>{order.status === "received" ? "Ver recepcion" : "Puntear recepcion"}</span>
                          <span className="text-xs text-muted-foreground group-open:hidden">Abrir</span>
                          <span className="hidden text-xs text-muted-foreground group-open:inline">Cerrar</span>
                        </summary>
                        <div className="border-t border-border/70 p-3">
                          <ReceiveOrderForm order={order} products={products} onStageChange={handleStageChange} />
                        </div>
                      </details>
                      <details className="motion-panel group rounded-lg border border-border/70 bg-background/60">
                        <summary className="motion-press flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-medium transition-colors hover:bg-accent/45">
                          <span className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Historial
                          </span>
                          <span className="text-xs text-muted-foreground group-open:hidden">Abrir</span>
                          <span className="hidden text-xs text-muted-foreground group-open:inline">Cerrar</span>
                        </summary>
                        <div className="border-t border-border/70 p-3">
                          <OrderTimeline events={order.events ?? []} />
                        </div>
                      </details>
                    </div>
                  </details>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function OrderTimeline({ events }: { events: PurchaseOrderEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin eventos registrados para este pedido.</p>;
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={event.id} className="motion-list-item rounded-lg border border-border/70 bg-card/70 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">{eventLabels[event.type]}</p>
              <p className="text-xs text-muted-foreground">
                {event.users?.full_name || event.users?.email || "Usuario"} · {formatDateTime(event.created_at)}
              </p>
            </div>
            {event.amount !== null ? <span className="text-sm font-medium">{money(event.amount)}</span> : null}
          </div>
          {event.from_status || event.to_status ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {event.from_status ? <Badge variant="secondary">{statusLabels[event.from_status]}</Badge> : null}
              {event.from_status && event.to_status ? <ArrowRight className="h-3.5 w-3.5" /> : null}
              {event.to_status ? <Badge variant={statusVariant(event.to_status)}>{statusLabels[event.to_status]}</Badge> : null}
            </div>
          ) : null}
          {event.payment_method_name ? <p className="mt-2 text-sm text-muted-foreground">Metodo: {event.payment_method_name}</p> : null}
          {event.note ? <p className="mt-2 whitespace-pre-wrap text-sm">{event.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }: { icon: Icon; label: string; value: number }) {
  return (
    <div className="motion-surface rounded-lg border border-border/70 bg-card/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/45 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function WorkflowSteps({ stage }: { stage: OrderStage }) {
  const steps = [
    { value: "planning", label: "Pedido", icon: ClipboardList },
    { value: "payment", label: "Pago", icon: CreditCard },
    { value: "transit", label: "Llegada", icon: Truck },
    { value: "received", label: "Recibido", icon: PackageCheck },
  ] satisfies { value: Exclude<OrderStage, "all">; label: string; icon: Icon }[];
  const stageIndex = steps.findIndex((step) => step.value === stage);

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const active = index <= stageIndex;
        return (
          <div
            key={step.value}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              active ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border/70 bg-muted/25 text-muted-foreground",
            )}
          >
            {active ? <CheckCircle2 className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function buildStageOptions(orders: PurchaseOrder[]) {
  return [
    { value: "all", label: "Todos", count: orders.length },
    { value: "planning", label: "Pedido", count: orders.filter((order) => orderStage(order) === "planning").length },
    { value: "payment", label: "Pago", count: orders.filter((order) => orderStage(order) === "payment").length },
    { value: "transit", label: "Llegada", count: orders.filter((order) => orderStage(order) === "transit").length },
    { value: "received", label: "Recibidos", count: orders.filter((order) => orderStage(order) === "received").length },
    { value: "canceled", label: "Cancelados", count: orders.filter((order) => orderStage(order) === "canceled").length },
  ] satisfies { value: OrderStage; label: string; count: number }[];
}

function parseStageFilter(value?: string): OrderStage {
  if (value === "planning" || value === "payment" || value === "transit" || value === "received" || value === "canceled") return value;
  return "all";
}

function filterOrdersBySearch(orders: PurchaseOrder[], query: string) {
  const term = normalizeSearch(query);
  if (!term) return orders;

  return orders.filter((order) => {
    const supplier = order.suppliers?.name || order.supplier || "";
    const expectedArrival = order.expected_arrival ? formatDate(order.expected_arrival) : "";
    const searchable = [
      order.order_number,
      supplier,
      order.expected_arrival ?? "",
      expectedArrival,
      statusLabels[order.status],
    ].join(" ");
    return normalizeSearch(searchable).includes(term);
  });
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function buildLowStockOrderValues(products: Product[]): PurchaseOrderFormValues | null {
  const lowStockProducts = products.filter((product) => product.minimum_stock > 0 && product.current_stock < product.minimum_stock);
  if (lowStockProducts.length === 0) return null;

  const supplierIds = new Set(lowStockProducts.map((product) => product.primary_supplier_id).filter(Boolean));

  return {
    supplier_id: supplierIds.size === 1 ? [...supplierIds][0] ?? "" : "",
    status: "draft",
    expected_arrival: "",
    advance_percent: 0,
    advance_paid: 0,
    notes: "Pedido sugerido por stock bajo.",
    expected_items: lowStockProducts.map((product) => ({
      product_id: product.id,
      quantity_requested: Math.max(1, product.minimum_stock - product.current_stock + 1),
      unit_cost: product.cost,
    })),
  };
}

function buildTotals(orders: PurchaseOrder[], today: Date, soon: Date) {
  return orders.reduce(
    (acc, order) => {
      if (!["received", "canceled"].includes(order.status)) acc.active += 1;
      if (["partially_paid", "paid"].includes(order.status)) acc.payment += 1;
      if (order.status === "in_transit") acc.transit += 1;
      if (order.expected_arrival && order.status !== "received") {
        const arrival = startOfDay(new Date(order.expected_arrival));
        if (arrival >= today && arrival <= soon) acc.soon += 1;
      }
      return acc;
    },
    { active: 0, payment: 0, transit: 0, soon: 0 },
  );
}

function orderStage(order: PurchaseOrder): OrderStage {
  if (order.status === "canceled") return "canceled";
  if (order.status === "received") return "received";
  if (order.status === "in_transit") return "transit";
  if (order.status === "partially_paid" || order.status === "paid") return "payment";
  return "planning";
}

function orderProgress(order: PurchaseOrder) {
  const receivedById = new Map(order.received_items.map((item) => [item.product_id, item.received_quantity ?? 0]));
  const requested = order.expected_items.reduce((total, item) => total + item.quantity_requested, 0);
  const received = order.expected_items.reduce(
    (total, item) => total + Math.min(receivedById.get(item.product_id) ?? item.received_quantity ?? 0, item.quantity_requested),
    0,
  );
  const missing = Math.max(0, requested - received);
  const percent = requested === 0 ? 0 : Math.min(100, Math.round((received / requested) * 100));
  return { requested, received, missing, percent };
}

function nextAction(order: PurchaseOrder, missing: number) {
  if (order.status === "canceled") return "Pedido cancelado. Historial conserva motivo y usuario.";
  if (order.status === "received" && missing > 0) return "Pedido cerrado con faltantes. Nota y cantidades quedan como evidencia.";
  if (order.status === "received") return "Recepcion cerrada. Inventario actualizado.";
  if (order.status === "in_transit") return missing > 0 ? "Mercancia en camino. Abre recepcion y captura lo recibido." : "Todo punteado. Guarda recepcion para cerrar.";
  if (order.status === "paid") return "Pedido pagado. Cuando llegue, abre recepcion y escanea o captura cantidades.";
  if (order.status === "partially_paid") return "Anticipo registrado. Completa pago o espera llegada segun tu acuerdo.";
  if (order.status === "quoted") return "Cotizacion lista. Confirma pago y fecha antes de recibir.";
  return "Pedido borrador. Revisa productos, proveedor y fecha esperada.";
}

function statusVariant(status: PurchaseOrder["status"]) {
  if (status === "canceled") return "destructive";
  if (status === "received") return "success";
  if (status === "partially_paid" || status === "in_transit") return "warning";
  return "default";
}

const statusLabels: Record<PurchaseOrder["status"], string> = {
  draft: "Draft",
  quoted: "Cotizado",
  partially_paid: "Pagado parcial",
  paid: "Pagado completo",
  in_transit: "En transito",
  received: "Recibido",
  canceled: "Cancelado",
};

const eventLabels: Record<PurchaseOrderEvent["type"], string> = {
  created: "Pedido creado",
  payment_recorded: "Pago registrado",
  marked_in_transit: "Marcado en camino",
  received_complete: "Recepcion completa",
  received_progress: "Avance de recepcion",
  received_incomplete_closed: "Cerrado incompleto",
  note_added: "Nota agregada",
  canceled: "Pedido cancelado",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
