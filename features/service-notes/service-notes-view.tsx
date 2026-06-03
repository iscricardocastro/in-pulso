"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  CheckCircle2,
  CreditCard,
  Eye,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate, money } from "@/lib/utils";
import { createCatalogItem } from "@/services/catalogs";
import { createCustomer } from "@/services/customers";
import {
  cancelServiceNote,
  changeServiceNoteStatus,
  createServiceNote,
  getServiceNoteByNumber,
  recordServiceNotePayment,
  searchServiceProducts,
  upsertServiceTemplate,
} from "@/services/service-notes";
import type {
  CatalogItem,
  Customer,
  DiscountType,
  ServiceNote,
  ServiceNoteStatus,
  ServiceTemplate,
} from "@/types/database";

type Mode = "history" | "new" | "detail";
type ReceiptPrintSize = "thermal-80" | "standard";
type ReceiptContext = {
  company: { id: string; name: string; slug: string };
  seller: { email: string; full_name: string | null };
};
type ProductOption = {
  id: string;
  name: string;
  internal_code: string;
  current_stock: number;
  sale_price: number | null;
  suggested_price: number | null;
};
type DraftItem = {
  key: string;
  item_type: "service" | "part";
  product_id: string | null;
  product_code: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  current_stock?: number;
};
type DraftPayment = {
  key: string;
  payment_method_id: string;
  amount_received: string;
  comments: string;
};

const nextKey = () => crypto.randomUUID();

function getSavedReceiptPrintSize(): ReceiptPrintSize {
  if (typeof window === "undefined") return "thermal-80";
  const saved = window.localStorage.getItem("pulso-receipt-print-size");
  return saved === "thermal-80" || saved === "standard" ? saved : "thermal-80";
}

export function ServiceNotesView({
  catalogs,
  customers,
  notes,
  receiptContext,
  templates,
}: {
  catalogs: CatalogItem[];
  customers: Customer[];
  notes: ServiceNote[];
  receiptContext: ReceiptContext;
  templates: ServiceTemplate[];
}) {
  const [mode, setMode] = useState<Mode>("history");
  const [activeNote, setActiveNote] = useState<ServiceNote | null>(null);
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [templateOptions, setTemplateOptions] = useState(templates);
  const [paymentOptions, setPaymentOptions] = useState(catalogs.filter((item) => item.kind === "payment_method"));
  const [printSize, setPrintSize] = useState<ReceiptPrintSize>(getSavedReceiptPrintSize);
  const [printJob, setPrintJob] = useState<ServiceNote | null>(null);

  useEffect(() => {
    if (!printJob) return;
    document.body.classList.add("is-printing-receipt");
    const timer = window.setTimeout(() => {
      window.print();
      document.body.classList.remove("is-printing-receipt");
      setPrintJob(null);
    }, 80);
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("is-printing-receipt");
    };
  }, [printJob]);

  function setReceiptPrintSize(size: ReceiptPrintSize) {
    setPrintSize(size);
    window.localStorage.setItem("pulso-receipt-print-size", size);
  }

  async function openDetail(noteNumber: string) {
    try {
      const note = await getServiceNoteByNumber(noteNumber);
      setActiveNote(note);
      setMode("detail");
      return note;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir nota");
      return null;
    }
  }

  function showHistory() {
    setMode("history");
    setActiveNote(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas</h1>
          <p className="text-sm text-muted-foreground">Servicios, reparaciones, anticipos y refacciones sin mezclar el punto de venta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode !== "history" ? (
            <Button variant="outline" type="button" onClick={showHistory}>
              <X className="h-4 w-4" />
              Cerrar
            </Button>
          ) : null}
          {mode === "history" ? (
            <Button type="button" onClick={() => setMode("new")}>
              <Plus className="h-4 w-4" />
              Nueva nota
            </Button>
          ) : null}
        </div>
      </div>

      {mode === "history" ? (
        <ServiceNotesHistory
          notes={notes}
          onOpenDetail={openDetail}
          onPrint={async (noteNumber) => {
            const note = await openDetail(noteNumber);
            if (note) setPrintJob(note);
          }}
        />
      ) : null}

      {mode === "new" ? (
        <ServiceNoteCapture
          customers={customerOptions}
          paymentOptions={paymentOptions}
          templates={templateOptions}
          onCustomerCreated={(customer) => setCustomerOptions((current) => [...current, customer])}
          onPaymentMethodCreated={(method) => setPaymentOptions((current) => [...current, method])}
          onSaved={async (noteNumber) => {
            const note = await openDetail(noteNumber);
            if (note) setPrintJob(note);
          }}
          onTemplateCreated={(template) => setTemplateOptions((current) => [...current, template])}
        />
      ) : null}

      {mode === "detail" && activeNote ? (
        <ServiceNoteDetail
          note={activeNote}
          paymentOptions={paymentOptions}
          printSize={printSize}
          onPaymentMethodCreated={(method) => setPaymentOptions((current) => [...current, method])}
          onPrint={(note) => setPrintJob(note)}
          onPrintSizeChange={setReceiptPrintSize}
          onReload={async () => {
            const fresh = await getServiceNoteByNumber(activeNote.note_number);
            setActiveNote(fresh);
          }}
        />
      ) : null}

      {printJob ? <ServiceNoteReceiptPrintArea context={receiptContext} note={printJob} size={printSize} /> : null}
    </div>
  );
}

function ServiceNotesHistory({
  notes,
  onOpenDetail,
  onPrint,
}: {
  notes: ServiceNote[];
  onOpenDetail: (noteNumber: string) => void;
  onPrint: (noteNumber: string) => void;
}) {
  const columns = useMemo<ColumnDef<ServiceNote>[]>(
    () => [
      {
        accessorKey: "note_number",
        header: "Folio",
        cell: ({ row }) => <span className="font-medium">{row.original.note_number}</span>,
      },
      {
        id: "customer",
        accessorFn: (note) => note.customers?.name ?? "Cliente",
        header: "Cliente",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.customers?.name ?? "Cliente"}</p>
            <p className="text-xs text-muted-foreground">{formatDate(row.original.created_at)}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => <ServiceNoteStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => money(Number(row.original.total)),
      },
      {
        accessorKey: "balance_due",
        header: "Saldo",
        cell: ({ row }) => (
          <span className={cn("font-medium", Number(row.original.balance_due) > 0 && "text-amber-700 dark:text-amber-300")}>
            {money(Number(row.original.balance_due))}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              aria-label="Ver detalle"
              size="icon"
              title="Ver detalle"
              type="button"
              variant="ghost"
              onClick={() => onOpenDetail(row.original.note_number)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Reimprimir ticket"
              size="icon"
              title="Reimprimir ticket"
              type="button"
              variant="ghost"
              onClick={() => onPrint(row.original.note_number)}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        ),
        meta: { cellClassName: "text-right", headerClassName: "text-right" },
      },
    ],
    [onOpenDetail, onPrint],
  );

  const openCount = notes.filter((note) => note.status !== "delivered" && note.status !== "canceled").length;
  const dueTotal = notes.reduce((total, note) => total + Number(note.balance_due ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ServiceMetric label="Abiertas" value={openCount} />
        <ServiceMetric label="Saldo notas" value={money(dueTotal)} />
        <ServiceMetric label="Entregadas" value={notes.filter((note) => note.status === "delivered").length} />
      </div>
      <DataTable
        columns={columns}
        data={notes}
        emptyState={<EmptyState icon={ReceiptText} title="Sin notas" description="Crea una nota para recibir equipo, presupuesto o servicio." />}
        header={<CardTitle>Historial de notas</CardTitle>}
      />
    </div>
  );
}

function ServiceNoteCapture({
  customers,
  paymentOptions,
  templates,
  onCustomerCreated,
  onPaymentMethodCreated,
  onSaved,
  onTemplateCreated,
}: {
  customers: Customer[];
  paymentOptions: CatalogItem[];
  templates: ServiceTemplate[];
  onCustomerCreated: (customer: Customer) => void;
  onPaymentMethodCreated: (method: CatalogItem) => void;
  onSaved: (noteNumber: string) => void;
  onTemplateCreated: (template: ServiceTemplate) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [deviceFields, setDeviceFields] = useState<Record<string, string>>({});
  const [items, setItems] = useState<DraftItem[]>([emptyServiceItem()]);
  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [payments, setPayments] = useState<DraftPayment[]>([emptyPayment()]);
  const [notes, setNotes] = useState("");
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const activeTemplate = templates.find((template) => template.id === templateId) ?? templates[0];
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discountTotal = calculateDiscount(subtotal, discountType, discountValue);
  const total = Math.max(0, subtotal - discountTotal);
  const received = payments.reduce((sum, payment) => sum + parseMoneyInput(payment.amount_received), 0);
  const paid = Math.min(received, total);
  const changeDue = Math.max(0, received - total);
  const balanceDue = Math.max(0, total - paid);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function submit() {
    if (!customerId) {
      toast.error("Selecciona cliente");
      return;
    }
    if (!templateId) {
      toast.error("Selecciona plantilla");
      return;
    }
    if (items.some((item) => item.item_type === "part" && item.current_stock !== undefined && item.quantity > item.current_stock)) {
      toast.error("Una refaccion excede stock disponible");
      return;
    }

    startTransition(async () => {
      try {
        const noteNumber = await createServiceNote({
          customer_id: customerId,
          device_fields: deviceFields,
          discount_type: discountType,
          discount_value: discountValue,
          items: items.map((item) => ({
            description: item.description,
            item_type: item.item_type,
            product_code: item.product_code,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          notes,
          payments: payments
            .map((payment) => ({ ...payment, amount_received: parseMoneyInput(payment.amount_received) }))
            .filter((payment) => payment.amount_received > 0),
          template_id: templateId,
        });
        toast.success(`Nota ${noteNumber} creada`);
        onSaved(noteNumber);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear nota");
      }
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Nueva nota</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Recibe equipo, cotiza conceptos y registra anticipo.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <ServiceMetric label="Conceptos" value={items.length} compact />
                <ServiceMetric label="Anticipo" value={money(paid)} compact />
                <ServiceMetric label="Saldo" value={money(balanceDue)} compact />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <CreatableCombobox
                  emptyLabel="Sin clientes"
                  options={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
                  placeholder="Cliente requerido"
                  selectedValue={customerId}
                  value={customers.find((customer) => customer.id === customerId)?.name ?? ""}
                  valueMode="id"
                  onChange={setCustomerId}
                  onCreate={async (name) => {
                    const created = await createCustomer(name);
                    onCustomerCreated(created);
                    return { id: created.id, name: created.name };
                  }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Plantilla</Label>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setTemplateModalOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </div>
                <Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {(activeTemplate?.fields ?? []).map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    value={deviceFields[field.key] ?? ""}
                    onChange={(event) => setDeviceFields((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Conceptos</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setItems((current) => [...current, emptyServiceItem()])}>
                  <Wrench className="h-4 w-4" />
                  Servicio
                </Button>
                <ProductSearchBox
                  onSelect={(product) => setItems((current) => [...current, itemFromProduct(product)])}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border rounded-lg border border-border">
              {items.map((item) => (
                <div key={item.key} className="grid gap-3 p-3 lg:grid-cols-[120px_minmax(0,1fr)_90px_120px_110px_40px] lg:items-end">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Badge variant={item.item_type === "part" ? "default" : "secondary"}>
                      {item.item_type === "part" ? "Refaccion" : "Servicio"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripcion</Label>
                    <Input value={item.description} onChange={(event) => updateItem(item.key, { description: event.target.value })} />
                    {item.product_code ? <p className="text-xs text-muted-foreground">{item.product_code} · Stock {item.current_stock}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Cant.</Label>
                    <Input min={1} type="number" value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: Number(event.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio</Label>
                    <MoneyInput value={item.unit_price} onChange={(value) => updateItem(item.key, { unit_price: parseMoneyInput(value) })} />
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Importe</p>
                    <p className="font-semibold">{money(item.quantity * item.unit_price)}</p>
                  </div>
                  <Button
                    aria-label="Quitar concepto"
                    disabled={items.length === 1}
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5 xl:sticky xl:top-5 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Select value={discountType ?? ""} onChange={(event) => setDiscountType((event.target.value || null) as DiscountType | null)}>
                <option value="">Sin descuento</option>
                <option value="amount">Monto</option>
                <option value="percent">Porcentaje</option>
              </Select>
              <MoneyInput value={discountValue} onChange={(value) => setDiscountValue(parseMoneyInput(value))} />
            </div>
            <div className="space-y-2 rounded-lg bg-muted/35 p-3">
              <SummaryRow label="Subtotal" value={money(subtotal)} />
              <SummaryRow label="Descuento" value={money(discountTotal)} />
              <SummaryRow label="Total" value={money(total)} strong />
              <SummaryRow label="Recibido" value={money(received)} />
              <SummaryRow label="Aplicado" value={money(paid)} />
              {changeDue > 0 ? <SummaryRow label="Cambio" value={money(changeDue)} strong /> : null}
              <SummaryRow label="Saldo" value={money(balanceDue)} strong />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Anticipos</Label>
                <Button size="sm" type="button" variant="outline" onClick={() => setPayments((current) => [...current, emptyPayment()])}>
                  <Plus className="h-4 w-4" />
                  Pago
                </Button>
              </div>
              {payments.map((payment) => (
                <PaymentDraft
                  key={payment.key}
                  payment={payment}
                  paymentOptions={paymentOptions}
                  onCreateMethod={onPaymentMethodCreated}
                  onRemove={() => setPayments((current) => current.filter((entry) => entry.key !== payment.key))}
                  onUpdate={(patch) => setPayments((current) => current.map((entry) => (entry.key === payment.key ? { ...entry, ...patch } : entry)))}
                />
              ))}
            </div>

            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>

            <Button className="w-full" disabled={pending} type="button" onClick={submit}>
              <Save className="h-4 w-4" />
              {pending ? "Guardando..." : "Guardar nota"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {templateModalOpen ? (
        <TemplateModal
          onClose={() => setTemplateModalOpen(false)}
          onSaved={(template) => {
            onTemplateCreated(template);
            setTemplateId(template.id);
            setTemplateModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ServiceNoteDetail({
  note,
  paymentOptions,
  printSize,
  onPaymentMethodCreated,
  onPrint,
  onPrintSizeChange,
  onReload,
}: {
  note: ServiceNote;
  paymentOptions: CatalogItem[];
  printSize: ReceiptPrintSize;
  onPaymentMethodCreated: (method: CatalogItem) => void;
  onPrint: (note: ServiceNote) => void;
  onPrintSizeChange: (size: ReceiptPrintSize) => void;
  onReload: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [payment, setPayment] = useState<DraftPayment>(emptyPayment());
  const [statusNote, setStatusNote] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const canWork = note.status !== "delivered" && note.status !== "canceled";

  function reloadAfter(action: () => Promise<void>, success: string) {
    startTransition(async () => {
      try {
        await action();
        await onReload();
        toast.success(success);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar nota");
      }
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{note.note_number}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{note.customers?.name ?? "Cliente"} · {formatDate(note.created_at)}</p>
              </div>
              <ServiceNoteStatusBadge status={note.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(note.device_fields ?? {}).map(([key, value]) => (
                value ? (
                  <div key={key} className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">{fieldLabel(note.template?.fields ?? [], key)}</p>
                    <p className="mt-1 text-sm font-medium">{value}</p>
                  </div>
                ) : null
              ))}
            </div>
            {note.notes ? <p className="rounded-lg bg-muted/35 p-3 text-sm">{note.notes}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conceptos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border rounded-lg border border-border">
              {(note.items ?? []).map((item) => (
                <div key={item.id} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_90px_120px] md:items-center">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.item_type === "part" ? `Refaccion ${item.product_code ?? ""}` : "Servicio"} · {item.quantity} x {money(Number(item.unit_price))}
                    </p>
                  </div>
                  <Badge variant={item.item_type === "part" ? "default" : "secondary"}>
                    {item.item_type === "part" ? "Inventario" : "Libre"}
                  </Badge>
                  <p className="text-right font-semibold">{money(Number(item.line_total))}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(note.events ?? []).map((event) => (
              <div key={event.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium">{eventLabel(event.type)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{event.note || event.payment_method_name || "Sin nota"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5 xl:sticky xl:top-5 xl:self-start">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>Cobro</CardTitle>
              <Badge variant={Number(note.balance_due) > 0 ? "warning" : "success"}>
                {Number(note.balance_due) > 0 ? "Saldo" : "Cubierto"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg bg-muted/35 p-3">
              <SummaryRow label="Subtotal" value={money(Number(note.subtotal))} />
              <SummaryRow label="Descuento" value={money(Number(note.discount_total))} />
              <SummaryRow label="Total" value={money(Number(note.total))} strong />
              <SummaryRow label="Pagado" value={money(Number(note.paid_total))} />
              <SummaryRow label="Saldo" value={money(Number(note.balance_due))} strong />
            </div>
            {(note.payments ?? []).length > 0 ? (
              <div className="space-y-2">
                {(note.payments ?? []).map((entry) => (
                  <div key={entry.id} className="space-y-1">
                    <SummaryRow label={entry.payment_method_name} value={money(Number(entry.amount_paid))} />
                    {Number(entry.change_due) > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Recibido {money(Number(entry.amount_received))} · Cambio {money(Number(entry.change_due))}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {canWork && Number(note.balance_due) > 0 ? (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <Label>Registrar pago</Label>
                <PaymentDraft
                  payment={payment}
                  paymentOptions={paymentOptions}
                  onCreateMethod={onPaymentMethodCreated}
                  onRemove={() => setPayment(emptyPayment())}
                  onUpdate={(patch) => setPayment((current) => ({ ...current, ...patch }))}
                />
                <Button
                  disabled={pending || !payment.payment_method_id || parseMoneyInput(payment.amount_received) <= 0}
                  type="button"
                  onClick={() =>
                    reloadAfter(
                      () =>
                        recordServiceNotePayment({
                          amount_received: parseMoneyInput(payment.amount_received),
                          comments: payment.comments,
                          payment_method_id: payment.payment_method_id,
                          service_note_id: note.id,
                        }),
                      "Pago registrado",
                    )
                  }
                >
                  <CreditCard className="h-4 w-4" />
                  Registrar pago
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={printSize} onChange={(event) => onPrintSizeChange(event.target.value as ReceiptPrintSize)}>
                <option value="thermal-80">80mm</option>
                <option value="standard">Carta</option>
              </Select>
              <Button type="button" variant="outline" onClick={() => onPrint(note)}>
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
            </div>

            {canWork ? (
              <div className="space-y-3">
                <Textarea placeholder="Nota de cambio de estado" value={statusNote} onChange={(event) => setStatusNote(event.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <StatusButton label="En proceso" status="in_progress" disabled={pending} note={note} statusNote={statusNote} onChange={reloadAfter} />
                  <StatusButton label="Listo" status="ready" disabled={pending} note={note} statusNote={statusNote} onChange={reloadAfter} />
                  <Button
                    className="col-span-2"
                    disabled={pending}
                    type="button"
                    onClick={() => reloadAfter(() => changeServiceNoteStatus({ note: statusNote, service_note_id: note.id, status: "delivered" }), "Nota entregada")}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Entregar
                  </Button>
                </div>
                <div className="space-y-2 rounded-lg border border-destructive/20 p-3">
                  <Label>Cancelar</Label>
                  <Input placeholder="Motivo requerido" value={cancelNote} onChange={(event) => setCancelNote(event.target.value)} />
                  <Button
                    disabled={pending || !cancelNote.trim()}
                    type="button"
                    variant="destructive"
                    onClick={() => reloadAfter(() => cancelServiceNote({ note: cancelNote, service_note_id: note.id }), "Nota cancelada")}
                  >
                    <Ban className="h-4 w-4" />
                    Cancelar nota
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusButton({
  disabled,
  label,
  note,
  status,
  statusNote,
  onChange,
}: {
  disabled: boolean;
  label: string;
  note: ServiceNote;
  status: ServiceNoteStatus;
  statusNote: string;
  onChange: (action: () => Promise<void>, success: string) => void;
}) {
  return (
    <Button
      disabled={disabled || note.status === status}
      type="button"
      variant="outline"
      onClick={() => onChange(() => changeServiceNoteStatus({ note: statusNote, service_note_id: note.id, status }), "Estado actualizado")}
    >
      {label}
    </Button>
  );
}

function PaymentDraft({
  payment,
  paymentOptions,
  onCreateMethod,
  onRemove,
  onUpdate,
}: {
  payment: DraftPayment;
  paymentOptions: CatalogItem[];
  onCreateMethod: (method: CatalogItem) => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<DraftPayment>) => void;
}) {
  return (
    <div className="space-y-2">
      <CreatableCombobox
        emptyLabel="Sin metodos"
        options={paymentOptions.map((method) => ({ id: method.id, name: method.name }))}
        placeholder="Metodo de pago"
        selectedValue={payment.payment_method_id}
        value={paymentOptions.find((method) => method.id === payment.payment_method_id)?.name ?? ""}
        valueMode="id"
        onChange={(value) => onUpdate({ payment_method_id: value })}
        onCreate={async (name) => {
          const created = await createCatalogItem("payment_method", name);
          onCreateMethod(created);
          return { id: created.id, name: created.name };
        }}
      />
      <div className="grid grid-cols-[1fr_44px] gap-2">
        <MoneyInput value={payment.amount_received} onChange={(value) => onUpdate({ amount_received: value })} />
        <Button aria-label="Limpiar pago" size="icon" type="button" variant="ghost" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Input placeholder="Comentario pago" value={payment.comments} onChange={(event) => onUpdate({ comments: event.target.value })} />
    </div>
  );
}

function ProductSearchBox({ onSelect }: { onSelect: (product: ProductOption) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [pending, startTransition] = useTransition();

  function search(nextQuery: string) {
    setQuery(nextQuery);
    if (nextQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      try {
        setResults(await searchServiceProducts(nextQuery));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo buscar producto");
      }
    });
  }

  return (
    <div className="relative min-w-64">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar refaccion" value={query} onChange={(event) => search(event.target.value)} />
      </div>
      {results.length > 0 ? (
        <div className="absolute right-0 z-40 mt-2 w-full overflow-hidden rounded-lg border border-border bg-card shadow-md">
          {results.map((product) => (
            <button
              key={product.id}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
              type="button"
              onClick={() => {
                onSelect(product);
                setQuery("");
                setResults([]);
              }}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{product.name}</span>
                <span className="text-xs text-muted-foreground">{product.internal_code} · Stock {product.current_stock}</span>
              </span>
              <span className="font-medium">{money(Number(product.sale_price ?? product.suggested_price ?? 0))}</span>
            </button>
          ))}
        </div>
      ) : pending ? (
        <p className="absolute mt-1 text-xs text-muted-foreground">Buscando...</p>
      ) : null}
    </div>
  );
}

function TemplateModal({ onClose, onSaved }: { onClose: () => void; onSaved: (template: ServiceTemplate) => void }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [fields, setFields] = useState([
    { key: "elemento", label: "Elemento" },
    { key: "referencia", label: "Referencia" },
    { key: "detalle", label: "Detalle" },
  ]);

  function submit() {
    startTransition(async () => {
      try {
        const template = await upsertServiceTemplate({ fields, name });
        toast.success("Plantilla creada");
        onSaved(template);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear plantilla");
      }
    });
  }

  return (
    <ModalOverlay>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Nueva plantilla</h2>
            <p className="text-sm text-muted-foreground">Campos que apareceran al capturar nota.</p>
          </div>
          <Button aria-label="Cerrar" size="icon" type="button" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          {fields.map((field, index) => (
            <div key={index} className="grid grid-cols-[1fr_44px] gap-2">
              <Input
                placeholder="Etiqueta"
                value={field.label}
                onChange={(event) => {
                  const label = event.target.value;
                  setFields((current) => current.map((entry, entryIndex) => (
                    entryIndex === index ? { key: slugKey(label), label } : entry
                  )));
                }}
              />
              <Button aria-label="Quitar campo" size="icon" type="button" variant="ghost" onClick={() => setFields((current) => current.filter((_, entryIndex) => entryIndex !== index))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setFields((current) => [...current, { key: "", label: "" }])}>
            <Plus className="h-4 w-4" />
            Agregar campo
          </Button>
          <Button className="w-full" disabled={pending || !name.trim()} type="button" onClick={submit}>
            {pending ? "Guardando..." : "Guardar plantilla"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function ServiceNoteReceiptPrintArea({ context, note, size }: { context: ReceiptContext; note: ServiceNote; size: ReceiptPrintSize }) {
  if (typeof document === "undefined") return null;
  const items = note.items ?? [];
  const payments = note.payments ?? [];
  const seller = context.seller.full_name || context.seller.email;

  return createPortal(
    <div className={cn("print-area sale-receipt-print-area", size === "thermal-80" ? "sale-receipt-80" : "sale-receipt-standard")}>
      <article className="sale-receipt">
        <header className="sale-receipt-header">
          <p className="sale-receipt-company">{context.company.name}</p>
          <p>{context.company.slug}</p>
          <p>Nota de servicio</p>
        </header>
        <section className="sale-receipt-section">
          <ReceiptLine label="Folio" value={note.note_number} />
          <ReceiptLine label="Fecha" value={formatDate(note.created_at)} />
          <ReceiptLine label="Atendio" value={seller} />
          <ReceiptLine label="Cliente" value={note.customers?.name ?? "Cliente"} />
          {note.customers?.phone ? <ReceiptLine label="Telefono" value={note.customers.phone} /> : null}
          <ReceiptLine label="Estado" value={statusLabel(note.status)} />
        </section>
        {Object.entries(note.device_fields ?? {}).length > 0 ? (
          <section className="sale-receipt-section">
            <p className="sale-receipt-subtitle">Detalle</p>
            {Object.entries(note.device_fields).map(([key, value]) => (
              value ? <ReceiptLine key={key} label={fieldLabel(note.template?.fields ?? [], key)} value={value} /> : null
            ))}
          </section>
        ) : null}
        <section className="sale-receipt-section">
          <div className="sale-receipt-items-head">
            <span>Concepto</span>
            <span>Importe</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="sale-receipt-item">
              <div>
                <p>{item.description}</p>
                <p className="sale-receipt-muted">{item.quantity} x {money(Number(item.unit_price))}</p>
              </div>
              <strong>{money(Number(item.line_total))}</strong>
            </div>
          ))}
        </section>
        <section className="sale-receipt-section">
          <ReceiptLine label="Subtotal" value={money(Number(note.subtotal))} />
          {Number(note.discount_total) > 0 ? <ReceiptLine label="Descuento" value={money(Number(note.discount_total))} /> : null}
          <ReceiptLine strong label="Total" value={money(Number(note.total))} />
          <ReceiptLine label="Pagado" value={money(Number(note.paid_total))} />
          {Number(note.balance_due) > 0 ? <ReceiptLine strong label="Saldo" value={money(Number(note.balance_due))} /> : null}
        </section>
        {payments.length > 0 ? (
          <section className="sale-receipt-section">
            <p className="sale-receipt-subtitle">Pagos</p>
            {payments.map((payment) => (
              <div key={payment.id}>
                <ReceiptLine label={payment.payment_method_name} value={money(Number(payment.amount_paid))} />
                {Number(payment.change_due) > 0 ? <ReceiptLine label="Cambio" value={money(Number(payment.change_due))} /> : null}
              </div>
            ))}
          </section>
        ) : null}
        {note.notes ? (
          <section className="sale-receipt-section">
            <p className="sale-receipt-subtitle">Notas</p>
            <p>{note.notes}</p>
          </section>
        ) : null}
        <footer className="sale-receipt-footer">
          <p>{note.note_number}</p>
          <p>Generado por Pulso.</p>
        </footer>
      </article>
    </div>,
    document.body,
  );
}

function ReceiptLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("sale-receipt-line", strong && "sale-receipt-line-strong")}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ServiceMetric({ compact = false, label, value }: { compact?: boolean; label: string; value: number | string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card px-3 py-2", compact && "min-w-20 bg-muted/35 text-center")}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function ServiceNoteStatusBadge({ status }: { status: ServiceNoteStatus }) {
  const variant = status === "delivered" ? "success" : status === "canceled" ? "destructive" : status === "ready" ? "warning" : "default";
  return <Badge variant={variant}>{statusLabel(status)}</Badge>;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-sm", strong && "font-semibold")}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function MoneyInput({ value, onChange }: { value: number | string; onChange: (value: string) => void }) {
  return <Input inputMode="decimal" value={String(value)} onChange={(event) => onChange(event.target.value)} />;
}

function emptyServiceItem(): DraftItem {
  return {
    description: "",
    item_type: "service",
    key: nextKey(),
    product_code: null,
    product_id: null,
    quantity: 1,
    unit_price: 0,
  };
}

function itemFromProduct(product: ProductOption): DraftItem {
  return {
    current_stock: product.current_stock,
    description: product.name,
    item_type: "part",
    key: nextKey(),
    product_code: product.internal_code,
    product_id: product.id,
    quantity: 1,
    unit_price: Number(product.sale_price ?? product.suggested_price ?? 0),
  };
}

function emptyPayment(): DraftPayment {
  return { amount_received: "", comments: "", key: nextKey(), payment_method_id: "" };
}

function parseMoneyInput(value: number | string) {
  const parsed = Number(String(value).replace(/,/g, "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateDiscount(subtotal: number, type: DiscountType | null, value: number) {
  if (!type || value <= 0) return 0;
  if (type === "percent") return roundMoney(subtotal * Math.min(value, 100) / 100);
  return roundMoney(Math.min(value, subtotal));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function statusLabel(status: ServiceNoteStatus) {
  const labels: Record<ServiceNoteStatus, string> = {
    canceled: "Cancelada",
    delivered: "Entregada",
    in_progress: "En proceso",
    ready: "Lista",
    received: "Recibida",
  };
  return labels[status];
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    canceled: "Cancelada",
    created: "Creada",
    delivered: "Entregada",
    payment_recorded: "Pago registrado",
    status_changed: "Cambio de estado",
    updated: "Actualizada",
  };
  return labels[type] ?? type;
}

function fieldLabel(fields: { key: string; label: string }[], key: string) {
  return fields.find((field) => field.key === key)?.label ?? key;
}

function slugKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
