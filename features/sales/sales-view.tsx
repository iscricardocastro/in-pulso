"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Ban, CreditCard, Edit, Eye, PackageSearch, Plus, Printer, Receipt, RotateCcw, Save, Search, TrendingUp, Trash2, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
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
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Barcode } from "@/features/labels/barcode";
import { discountAmount, lineSubtotal, lineTotal, roundMoney, saleTotals } from "@/features/sales/calculations";
import { newClientKey } from "@/lib/client-key";
import { formatReceiptDate } from "@/lib/date-format";
import { parseMoneyInput } from "@/lib/money";
import { getSavedReceiptPrintSize, saveReceiptPrintSize, type ReceiptPrintSize } from "@/lib/receipt-print";
import { cn, formatDate, money } from "@/lib/utils";
import { createCatalogItem } from "@/services/catalogs";
import { createCustomer } from "@/services/customers";
import { cancelSale, createSale, getSaleByNumber, refundSale, searchSaleProducts, updateSale } from "@/services/sales";
import type { CatalogItem, Customer, DiscountType, Product, Sale, SaleItem } from "@/types/database";

type Mode = "history" | "sale" | "refund" | "detail";
type CartItem = {
  key: string;
  product: Product;
  quantity: number;
  suggested_price: number;
  unit_price: number;
  discount: { type: DiscountType | null; value: number };
};
type PaymentLine = {
  key: string;
  payment_method_id: string;
  amount_received: string;
  comments: string;
};
type RefundQuantities = Record<string, number>;
type ReceiptContext = {
  company: {
    id: string;
    name: string;
    slug: string;
  };
  seller: {
    email: string;
    full_name: string | null;
  };
};

export function SalesView({
  catalogs,
  customers,
  initialDetailSaleNumber,
  receiptContext,
  sales,
}: {
  catalogs: CatalogItem[];
  customers: Customer[];
  initialDetailSaleNumber?: string;
  receiptContext: ReceiptContext;
  sales: Sale[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialDetailSaleNumber ? "detail" : "history");
  const [activeSaleNumber, setActiveSaleNumber] = useState(initialDetailSaleNumber ?? "");
  const [receiptPrintSize, setReceiptPrintSize] = useState<ReceiptPrintSize>(getSavedReceiptPrintSize);
  const [receiptPrintJob, setReceiptPrintJob] = useState<{ closeAfterPrint: boolean; sale: Sale; size: ReceiptPrintSize } | null>(null);
  const categories = catalogs.filter((item) => item.kind === "category");
  const paymentMethods = catalogs.filter((item) => item.kind === "payment_method");

  const closePanel = useCallback(() => {
    setMode("history");
    setActiveSaleNumber("");
    router.replace("/sales");
    router.refresh();
  }, [router]);

  function changeReceiptPrintSize(size: ReceiptPrintSize) {
    setReceiptPrintSize(size);
    saveReceiptPrintSize(size);
  }

  function queueReceiptPrint(sale: Sale, size = receiptPrintSize, closeAfterPrint = false) {
    setReceiptPrintJob({ closeAfterPrint, sale, size });
  }

  useEffect(() => {
    if (!receiptPrintJob) return;
    document.body.classList.add("is-printing-receipt");
    const timer = window.setTimeout(() => window.print(), 150);
    const handleAfterPrint = () => {
      document.body.classList.remove("is-printing-receipt");
      const shouldClose = receiptPrintJob.closeAfterPrint;
      setReceiptPrintJob(null);
      if (shouldClose) closePanel();
    };

    window.addEventListener("afterprint", handleAfterPrint, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("is-printing-receipt");
    };
  }, [closePanel, receiptPrintJob]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
          <p className="text-sm text-muted-foreground">Punto de venta, cobro y reembolsos con inventario.</p>
        </div>
        <div className="flex gap-2">
          {mode !== "history" ? (
            <Button type="button" variant="secondary" onClick={closePanel}>
              <X className="h-4 w-4" />
              Cerrar
            </Button>
          ) : null}
          {mode === "history" ? (
            <Button type="button" onClick={() => {
              setActiveSaleNumber("");
              setMode("sale");
            }}>
              <Receipt className="h-4 w-4" />
              Nueva venta
            </Button>
          ) : null}
        </div>
      </div>

      {mode === "history" ? (
        <SalesHistory
          sales={sales}
          onCancel={(saleNumber) => {
            setActiveSaleNumber(saleNumber);
            setMode("detail");
          }}
          onDetail={(saleNumber) => {
            setActiveSaleNumber(saleNumber);
            setMode("detail");
          }}
          onEdit={(saleNumber) => {
            setActiveSaleNumber(saleNumber);
            setMode("sale");
          }}
          onRefund={(saleNumber) => {
            setActiveSaleNumber(saleNumber);
            setMode("refund");
          }}
          onReprint={async (saleNumber) => {
            try {
              const sale = await getSaleByNumber(saleNumber);
              queueReceiptPrint(sale);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "No se pudo reimprimir ticket");
            }
          }}
        />
      ) : null}

      {mode === "sale" ? (
        <SalePanel
          key={activeSaleNumber || "new-sale"}
          categories={categories}
          customers={customers}
          initialSaleNumber={activeSaleNumber}
          paymentMethods={paymentMethods}
          receiptPrintSize={receiptPrintSize}
          onPrintSale={(sale, size) => queueReceiptPrint(sale, size, true)}
          onPrintSizeChange={changeReceiptPrintSize}
        />
      ) : null}

      {mode === "refund" ? (
        <RefundPanel
          key={activeSaleNumber}
          initialSaleNumber={activeSaleNumber}
          paymentMethods={paymentMethods}
          onRefunded={closePanel}
        />
      ) : null}

      {mode === "detail" ? (
        <SaleDetailPanel
          key={activeSaleNumber}
          saleNumber={activeSaleNumber}
          onCanceled={closePanel}
        />
      ) : null}
      {receiptPrintJob ? (
        <SaleReceiptPrintArea
          context={receiptContext}
          sale={receiptPrintJob.sale}
          size={receiptPrintJob.size}
        />
      ) : null}
    </div>
  );
}

function SalesHistory({
  sales,
  onCancel,
  onDetail,
  onEdit,
  onRefund,
  onReprint,
}: {
  sales: Sale[];
  onCancel: (saleNumber: string) => void;
  onDetail: (saleNumber: string) => void;
  onEdit: (saleNumber: string) => void;
  onRefund: (saleNumber: string) => void;
  onReprint: (saleNumber: string) => void;
}) {
  const columns = useMemo<ColumnDef<Sale>[]>(
    () => [
      {
        accessorKey: "sale_number",
        header: "Folio",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.sale_number}</span>,
      },
      {
        accessorKey: "created_at",
        header: "Fecha",
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        id: "customer",
        header: "Cliente",
        accessorFn: (sale) => sale.customers?.name ?? "Cliente general",
        cell: ({ row }) => row.original.customers?.name ?? "Cliente general",
        sortingFn: (a, b) =>
          (a.original.customers?.name ?? "Cliente general").localeCompare(b.original.customers?.name ?? "Cliente general"),
      },
      {
        id: "payment",
        header: "Pago",
        accessorFn: paymentSummary,
        cell: ({ row }) => paymentSummary(row.original),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => <span className="font-semibold">{money(Number(row.original.total))}</span>,
        meta: { cellClassName: "text-right", headerClassName: "text-right" },
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "completed" ? "success" : row.original.status === "canceled" ? "destructive" : "warning"}>
            {saleStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        cell: ({ row }) => {
          const sale = row.original;

          return (
            <div className="flex justify-end gap-1">
              <Button aria-label="Ver detalle" size="icon" title="Ver detalle" type="button" variant="ghost" onClick={() => onDetail(sale.sale_number)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button aria-label="Reimprimir ticket" size="icon" title="Reimprimir ticket" type="button" variant="ghost" onClick={() => onReprint(sale.sale_number)}>
                <Printer className="h-4 w-4" />
              </Button>
              <Button aria-label="Editar venta" disabled={sale.status !== "completed"} size="icon" title="Editar venta" type="button" variant="ghost" onClick={() => onEdit(sale.sale_number)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button aria-label="Reembolso" disabled={sale.status === "refunded" || sale.status === "canceled"} size="icon" title="Reembolso" type="button" variant="ghost" onClick={() => onRefund(sale.sale_number)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              {sale.balance_due > 0 && sale.customer_id ? (
                <Button aria-label="Ver adeudo" asChild size="icon" title="Ver adeudo" variant="ghost">
                  <Link href={`/debtors?customer=${sale.customer_id}&sale=${sale.sale_number}`} title="Ver adeudo">
                    <WalletCards className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
              <Button aria-label="Cancelar venta" disabled={sale.status === "canceled" || sale.status === "refunded"} size="icon" title="Cancelar venta" type="button" variant="ghost" onClick={() => onCancel(sale.sale_number)}>
                <Ban className="h-4 w-4" />
              </Button>
            </div>
          );
        },
        meta: { cellClassName: "text-right", headerClassName: "text-right" },
      },
    ],
    [onCancel, onDetail, onEdit, onRefund, onReprint],
  );

  return (
    <DataTable
      columns={columns}
      data={sales}
      emptyState={
        <EmptyState
          icon={Receipt}
          title="Aun no hay ventas"
          description="Cuando finalices ventas, apareceran aqui con paginacion y acciones."
        />
      }
      header={<CardTitle>Historial de ventas</CardTitle>}
      pageSizeOptions={[10, 25, 50]}
    />
  );
}

function SalePanel({
  categories,
  customers,
  initialSaleNumber,
  paymentMethods,
  receiptPrintSize,
  onPrintSale,
  onPrintSizeChange,
}: {
  categories: CatalogItem[];
  customers: Customer[];
  initialSaleNumber: string;
  paymentMethods: CatalogItem[];
  receiptPrintSize: ReceiptPrintSize;
  onPrintSale: (sale: Sale, size: ReceiptPrintSize) => void;
  onPrintSizeChange: (size: ReceiptPrintSize) => void;
}) {
  const editing = Boolean(initialSaleNumber);
  const [categoryId, setCategoryId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerOptions, setCustomerOptions] = useState(customers);
  const [paymentOptions, setPaymentOptions] = useState(paymentMethods);
  const [payments, setPayments] = useState<PaymentLine[]>([emptyPayment()]);
  const [comments, setComments] = useState("");
  const [allowDebt, setAllowDebt] = useState(false);
  const [saleDiscount, setSaleDiscount] = useState<{ type: DiscountType | null; value: number }>({ type: null, value: 0 });
  const [editNote, setEditNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadPending, startLoad] = useTransition();
  const [submitPending, startSubmit] = useTransition();
  const previousTotalRef = useRef(0);

  useEffect(() => {
    if (!initialSaleNumber) return;
    startLoad(async () => {
      try {
        const sale = await getSaleByNumber(initialSaleNumber);
        setCustomerId(sale.customer_id ?? "");
        setComments(sale.comments ?? "");
        setAllowDebt(sale.status === "with_debt" || sale.balance_due > 0);
        setSaleDiscount({ type: sale.discount_type, value: sale.discount_value });
        setCart((sale.items ?? []).map((item) => ({
          key: item.id,
          product: saleItemProduct(item),
          quantity: item.quantity,
          suggested_price: item.suggested_price,
          unit_price: item.unit_price,
          discount: { type: item.discount_type, value: item.discount_value },
        })));
        setPayments((sale.payments ?? []).map((payment) => ({
          key: payment.id,
          payment_method_id: payment.payment_method_id,
          amount_received: String(payment.amount_received),
          comments: payment.comments ?? "",
        })));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cargar venta");
      }
    });
  }, [initialSaleNumber]);

  const activeItem = cart.find((item) => item.key === activeKey) ?? null;
  const totals = useMemo(() => saleTotals(cart.map(toCalculationItem), saleDiscount), [cart, saleDiscount]);
  const paidTotal = roundMoney(payments.reduce((total, payment) => total + parseMoneyInput(payment.amount_received), 0));
  const missing = roundMoney(Math.max(0, totals.total - paidTotal));
  const changeDue = roundMoney(Math.max(0, paidTotal - totals.total));
  const currentDiscount = activeItem?.discount ?? saleDiscount;
  const normalizedPayments = payments.filter((payment) => payment.payment_method_id && parseMoneyInput(payment.amount_received) > 0);
  const canFinish = cart.length > 0
    && (normalizedPayments.length > 0 || (allowDebt && missing > 0))
    && (missing <= 0 || (allowDebt && Boolean(customerId)));

  useEffect(() => {
    if (cart.length === 0) {
      previousTotalRef.current = totals.total;
      return;
    }

    const previousTotal = previousTotalRef.current;
    setPayments((current) => {
      if (current.length !== 1) return current;
      const payment = current[0];
      const shouldDefaultMethod = !payment.payment_method_id && paymentOptions.length === 1;
      const shouldDefaultAmount = payment.amount_received === "" || parseMoneyInput(payment.amount_received) === previousTotal;
      if (!shouldDefaultMethod && !shouldDefaultAmount) return current;

      return [{
        ...payment,
        payment_method_id: shouldDefaultMethod ? paymentOptions[0].id : payment.payment_method_id,
        amount_received: shouldDefaultAmount ? String(totals.total) : payment.amount_received,
      }];
    });
    previousTotalRef.current = totals.total;
  }, [cart.length, paymentOptions, totals.total]);

  function addProduct(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          toast.error(`No puedes agregar mas de ${product.current_stock} piezas disponibles`);
          return current;
        }
        return current.map((item) => item.key === existing.key ? { ...item, quantity: item.quantity + 1 } : item);
      }
      const suggestedPrice = Number(product.suggested_price ?? 0);
      const salePrice = Number(product.sale_price ?? product.suggested_price ?? 0);
      const next = {
        key: newClientKey(),
        product,
        quantity: 1,
        suggested_price: suggestedPrice,
        unit_price: salePrice,
        discount: { type: null, value: 0 },
      };
      setActiveKey(next.key);
      return [...current, next];
    });
  }

  function updateItem(key: string, patch: Partial<CartItem>) {
    setCart((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function setQuantity(item: CartItem, quantity: number) {
    if (quantity > item.product.current_stock) toast.error(`No puedes agregar mas de ${item.product.current_stock} piezas disponibles`);
    updateItem(item.key, { quantity: Math.min(item.product.current_stock, Math.max(1, quantity)) });
  }

  function removeItem(key: string) {
    setCart((current) => current.filter((item) => item.key !== key));
    if (activeKey === key) setActiveKey(null);
  }

  function applyDiscount(type: DiscountType | null, value: number) {
    if (activeItem) {
      updateItem(activeItem.key, { discount: { type, value } });
      return;
    }
    setSaleDiscount({ type, value });
  }

  function updatePayment(key: string, patch: Partial<PaymentLine>) {
    setPayments((current) => current.map((payment) => payment.key === key ? { ...payment, ...patch } : payment));
  }

  function fillPaymentRemaining(key: string) {
    setPayments((current) => {
      const otherTotal = current
        .filter((payment) => payment.key !== key)
        .reduce((total, payment) => total + parseMoneyInput(payment.amount_received), 0);
      const amount = roundMoney(Math.max(0, totals.total - otherTotal));
      return current.map((payment) => payment.key === key ? { ...payment, amount_received: String(amount) } : payment);
    });
  }

  function submitSale() {
    if (editing && !editNote.trim()) {
      toast.error("Motivo requerido para editar; se guardara en historial");
      return;
    }

    startSubmit(async () => {
      try {
        let saleNumber = initialSaleNumber;
        const payload = {
          customer_id: customerId,
          comments,
          allow_debt: allowDebt,
          discount: saleDiscount,
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
            suggested_price: item.suggested_price,
            unit_price: item.unit_price,
            discount: item.discount,
          })),
          payments: normalizedPayments.map((payment) => ({
            payment_method_id: payment.payment_method_id,
            amount_received: parseMoneyInput(payment.amount_received),
            comments: payment.comments,
          })),
        };
        if (editing) {
          const sale = await getSaleByNumber(initialSaleNumber);
          await updateSale({ ...payload, sale_id: sale.id, note: editNote });
          saleNumber = sale.sale_number;
          toast.success("Venta actualizada");
        } else {
          saleNumber = await createSale(payload);
          toast.success(`Venta ${saleNumber} creada`);
        }
        const saleForPrint = await getSaleByNumber(saleNumber);
        onPrintSale(saleForPrint, receiptPrintSize);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar venta");
      }
    });
  }

  function requestFinish() {
    if (editing && !editNote.trim()) {
      toast.error("Motivo requerido para editar; se guardara en historial");
      return;
    }
    if (missing > 0 && !allowDebt) {
      toast.error("Completa pago o activa deuda");
      return;
    }
    if (missing > 0 && allowDebt && !customerId) {
      toast.error("Selecciona cliente para dejar deuda");
      return;
    }
    setConfirmOpen(true);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Card className="relative z-30 overflow-visible">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{editing ? `Editar ${initialSaleNumber}` : "Nueva venta"}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Busca, agrega y cobra desde la misma pantalla.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <SaleCaptureMetric label="Lineas" value={cart.length} />
                <SaleCaptureMetric label="Piezas" value={cart.reduce((total, item) => total + item.quantity, 0)} />
                <SaleCaptureMetric label="Total" value={money(totals.total)} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadPending ? <p className="text-sm text-muted-foreground">Cargando venta...</p> : null}
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <Label>Buscar producto</Label>
                <ProductSearchBox categoryId={categoryId} onSelect={addProduct} />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Enter agrega primer resultado. Categoria puede listar productos sin texto.</p>
          </CardContent>
        </Card>

        <Card className="relative z-0 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Carrito</CardTitle>
              {activeItem ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => setActiveKey(null)}>
                  <X className="h-4 w-4" />
                  Quitar seleccion
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
                <PackageSearch className="mb-2 h-6 w-6" />
                Agrega productos para iniciar venta.
              </div>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border">
                {cart.map((item) => {
                  const selected = activeKey === item.key;
                  const subtotal = lineSubtotal(item);
                  const itemDiscount = discountAmount(subtotal, item.discount);
                  return (
                    <div key={item.key} className={cn("p-3 transition-colors", selected && "bg-accent")}>
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_100px_118px_118px_104px_40px] lg:items-end">
                        <button className="min-w-0 cursor-pointer rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" type="button" onClick={() => setActiveKey(item.key)}>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product.internal_code} · Disponible {item.product.current_stock}</p>
                        </button>
                        <div className="space-y-2">
                          <Label>Cantidad</Label>
                          <Input min={1} max={item.product.current_stock} type="number" value={item.quantity} onChange={(event) => setQuantity(item, Number(event.target.value))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Sugerido</Label>
                          <Input disabled value={money(item.suggested_price)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Precio venta</Label>
                          <MoneyInput value={item.unit_price} onChange={(value) => updateItem(item.key, { unit_price: parseMoneyInput(value) })} />
                        </div>
                        <div className="space-y-1 text-right text-sm lg:text-left">
                          <p className="text-muted-foreground">Desc. {money(itemDiscount)}</p>
                          <p className="font-semibold">{money(lineTotal(item))}</p>
                        </div>
                        <Button aria-label="Quitar producto" size="icon" type="button" variant="ghost" onClick={() => removeItem(item.key)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="relative z-0 space-y-5 xl:sticky xl:top-5 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>{activeItem ? "Descuento articulo" : "Descuento venta"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Select value={currentDiscount.type ?? ""} onChange={(event) => applyDiscount((event.target.value || null) as DiscountType | null, currentDiscount.value)}>
                <option value="">Sin descuento</option>
                <option value="amount">Monto</option>
                <option value="percent">Porcentaje</option>
              </Select>
              <MoneyInput value={currentDiscount.value} onChange={(value) => applyDiscount(currentDiscount.type, parseMoneyInput(value))} />
            </div>
            <p className="text-xs text-muted-foreground">{activeItem ? `Aplicando a ${activeItem.product.name}.` : "Sin articulo seleccionado, aplica a toda la venta."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Cobro</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Cliente solo si hay deuda o necesitas registrarlo.</p>
              </div>
              <Badge variant={missing > 0 ? "warning" : "success"}>
                {missing > 0 ? `Falta ${money(missing)}` : "Cubierto"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <CreatableCombobox
                emptyLabel="Sin clientes"
                options={customerOptions.map((customer) => ({ id: customer.id, name: customer.name }))}
                placeholder="Cliente opcional"
                selectedValue={customerId}
                value={customerOptions.find((customer) => customer.id === customerId)?.name ?? ""}
                valueMode="id"
                onChange={setCustomerId}
                onCreate={async (name) => {
                  const created = await createCustomer(name);
                  setCustomerOptions((current) => [...current, created]);
                  return { id: created.id, name: created.name };
                }}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Pagos</Label>
                <Button size="sm" type="button" variant="outline" onClick={() => setPayments((current) => [...current, emptyPayment()])}>
                  <Plus className="h-4 w-4" />
                  Agregar pago
                </Button>
              </div>
              {payments.map((payment, index) => (
                <div key={payment.key} className="space-y-2 rounded-lg border border-border p-3">
                  <CreatableCombobox
                    emptyLabel="Sin metodos"
                    options={paymentOptions.map((method) => ({ id: method.id, name: method.name }))}
                    placeholder="Metodo de pago"
                    selectedValue={payment.payment_method_id}
                    value={paymentOptions.find((method) => method.id === payment.payment_method_id)?.name ?? ""}
                    valueMode="id"
                    onChange={(value) => updatePayment(payment.key, { payment_method_id: value })}
                    onCreate={async (name) => {
                      const created = await createCatalogItem("payment_method", name);
                      setPaymentOptions((current) => [...current, created]);
                      return { id: created.id, name: created.name };
                    }}
                  />
                  <div className="grid grid-cols-[1fr_44px] gap-2">
                    <MoneyInput value={payment.amount_received} onChange={(value) => updatePayment(payment.key, { amount_received: value })} />
                    <Button aria-label="Quitar pago" disabled={payments.length === 1} size="icon" type="button" variant="ghost" onClick={() => setPayments((current) => current.filter((entry) => entry.key !== payment.key))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" type="button" variant="secondary" onClick={() => fillPaymentRemaining(payment.key)}>
                      Cobrar restante
                    </Button>
                    <Button size="sm" type="button" variant="ghost" onClick={() => updatePayment(payment.key, { amount_received: "" })}>
                      Limpiar monto
                    </Button>
                  </div>
                  <Input placeholder={`Comentario pago ${index + 1}`} value={payment.comments} onChange={(event) => updatePayment(payment.key, { comments: event.target.value })} />
                </div>
              ))}
            </div>
            <details className="group rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium outline-none transition-colors group-open:mb-3 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                Notas de venta
              </summary>
              <Textarea placeholder="Comentario opcional" value={comments} onChange={(event) => setComments(event.target.value)} />
            </details>
            {editing ? (
              <div className="space-y-2">
                <Label>Motivo de edicion</Label>
                <Textarea value={editNote} onChange={(event) => setEditNote(event.target.value)} />
              </div>
            ) : null}
            <div className="space-y-2 rounded-lg bg-muted/35 p-3">
              <SummaryRow label="Subtotal" value={money(totals.subtotal)} />
              <SummaryRow label="Descuento venta" value={money(totals.discount_total)} />
              <SummaryRow label="Total" value={money(totals.total)} strong />
              <SummaryRow label="Recibido" value={money(paidTotal)} />
            </div>
            {missing > 0 ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p>Faltan {money(missing)} para completar venta.</p>
                <label className="flex cursor-pointer items-center gap-2">
                  <input checked={allowDebt} type="checkbox" onChange={(event) => setAllowDebt(event.target.checked)} />
                  Registrar deuda
                </label>
                {allowDebt && !customerId ? <p>Selecciona cliente para guardar deuda.</p> : null}
              </div>
            ) : null}
            {changeDue > 0 ? <SummaryRow label="Cambio" value={money(changeDue)} strong /> : null}
            <Button className="w-full" disabled={submitPending || !canFinish} type="button" onClick={requestFinish}>
              <Save className="h-4 w-4" />
              {submitPending ? "Guardando..." : editing ? "Guardar cambios" : "Finalizar venta"}
            </Button>
          </CardContent>
        </Card>
      </div>
      {confirmOpen ? (
        <SaleConfirmModal
          cart={cart}
          changeDue={changeDue}
          editing={editing}
          missing={missing}
          paidTotal={paidTotal}
          payments={normalizedPayments}
          paymentOptions={paymentOptions}
          printSize={receiptPrintSize}
          allowDebt={allowDebt}
          submitPending={submitPending}
          totals={totals}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            submitSale();
          }}
          onPrintSizeChange={onPrintSizeChange}
        />
      ) : null}
    </div>
  );
}

function SaleCaptureMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-20 rounded-lg border border-border bg-muted/35 px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function SaleReceiptPrintArea({
  context,
  sale,
  size,
}: {
  context: ReceiptContext;
  sale: Sale;
  size: ReceiptPrintSize;
}) {
  const items = sale.items ?? [];
  const payments = sale.payments ?? [];
  const pieces = items.reduce((total, item) => total + item.quantity, 0);
  const customer = sale.customers;
  const seller = context.seller.full_name || context.seller.email;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("print-area sale-receipt-print-area", size === "thermal-80" ? "sale-receipt-80" : "sale-receipt-standard")}>
      <article className="sale-receipt">
        <header className="sale-receipt-header">
          <p className="sale-receipt-company">{context.company.name}</p>
          <p>{context.company.slug}</p>
          <p>Ticket de venta</p>
        </header>

        <section className="sale-receipt-section">
          <ReceiptLine label="Folio" value={sale.sale_number} />
          <ReceiptLine label="Fecha" value={formatReceiptDate(sale.created_at)} />
          <ReceiptLine label="Vendedor" value={seller} />
          <ReceiptLine label="Cliente" value={customer?.name ?? "Cliente general"} />
          {customer?.phone ? <ReceiptLine label="Telefono" value={customer.phone} /> : null}
          {customer?.email ? <ReceiptLine label="Email" value={customer.email} /> : null}
        </section>

        <section className="sale-receipt-section">
          <div className="sale-receipt-items-head">
            <span>Producto</span>
            <span>Importe</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="sale-receipt-item">
              <div>
                <p>{item.product_name}</p>
                <p className="sale-receipt-muted">{item.product_code} · {item.quantity} x {money(Number(item.unit_price))}</p>
                {Number(item.discount_total) > 0 ? (
                  <p className="sale-receipt-muted">Desc. {money(Number(item.discount_total))}</p>
                ) : null}
              </div>
              <strong>{money(Number(item.line_total))}</strong>
            </div>
          ))}
        </section>

        <section className="sale-receipt-section">
          <ReceiptLine label="Articulos" value={String(items.length)} />
          <ReceiptLine label="Piezas" value={String(pieces)} />
          <ReceiptLine label="Subtotal" value={money(Number(sale.subtotal))} />
          {Number(sale.discount_total) > 0 ? <ReceiptLine label="Descuento" value={money(Number(sale.discount_total))} /> : null}
          <ReceiptLine strong label="Total" value={money(Number(sale.total))} />
          <ReceiptLine label="Pagado" value={money(Number(sale.paid_total))} />
          {Number(sale.balance_due) > 0 ? <ReceiptLine strong label="Saldo pendiente" value={money(Number(sale.balance_due))} /> : null}
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

        {sale.comments ? (
          <section className="sale-receipt-section">
            <p className="sale-receipt-subtitle">Notas</p>
            <p>{sale.comments}</p>
          </section>
        ) : null}

        <footer className="sale-receipt-footer">
          <div className="sale-receipt-barcode">
            <Barcode value={sale.sale_number} />
            <p>{sale.sale_number}</p>
          </div>
          <p>Gracias por su compra.</p>
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
      <span>{value}</span>
    </div>
  );
}

function ProductSearchBox({ categoryId, onSelect }: { categoryId: string; onSelect: (product: Product) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [pending, startTransition] = useTransition();
  const cache = useRef(new Map<string, Product[]>());
  const inputRef = useRef<HTMLInputElement>(null);
  const canSearch = query.trim().length >= 3 || Boolean(categoryId);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!canSearch) {
        setResults([]);
        return;
      }
      const key = `${categoryId || "all"}:${query.trim().toLowerCase()}`;
      const cached = cache.current.get(key);
      if (cached) {
        setResults(cached);
        setOpen(true);
        return;
      }
      startTransition(async () => {
        try {
          const found = await searchSaleProducts(query, categoryId || null);
          cache.current.set(key, found);
          setResults(found);
          setOpen(true);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "No se pudo buscar");
        }
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [categoryId, canSearch, query]);

  function select(product: Product) {
    onSelect(product);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative z-50">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        autoComplete="off"
        className="pl-9"
        placeholder="Codigo, nombre, marca o modelo"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0 || canSearch) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || results.length === 0) return;
          event.preventDefault();
          select(results[0]);
        }}
      />
      {open ? (
        <div className="absolute z-[80] mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-slate-950/15 ring-1 ring-border/60">
          <div className="max-h-72 overflow-auto p-1.5">
            {pending ? <div className="rounded-md px-3 py-2.5 text-sm text-muted-foreground">Buscando...</div> : null}
            {!pending && !canSearch ? <div className="rounded-md px-3 py-2.5 text-sm text-muted-foreground">Teclea 3 letras o selecciona categoria.</div> : null}
            {!pending && canSearch && results.length === 0 ? <div className="rounded-md px-3 py-2.5 text-sm text-muted-foreground">Sin productos disponibles.</div> : null}
            {results.map((product) => (
              <button
                key={product.id}
                className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                type="button"
                onClick={() => select(product)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{product.internal_code} · {product.name}</span>
                  <span className="block text-xs text-muted-foreground">Stock {product.current_stock}</span>
                </span>
                <span className="shrink-0 font-medium">{money(Number(product.sale_price ?? product.suggested_price ?? 0))}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SaleConfirmModal({
  allowDebt,
  cart,
  changeDue,
  editing,
  missing,
  paidTotal,
  payments,
  paymentOptions,
  printSize,
  submitPending,
  totals,
  onCancel,
  onConfirm,
  onPrintSizeChange,
}: {
  allowDebt: boolean;
  cart: CartItem[];
  changeDue: number;
  editing: boolean;
  missing: number;
  paidTotal: number;
  payments: PaymentLine[];
  paymentOptions: CatalogItem[];
  printSize: ReceiptPrintSize;
  submitPending: boolean;
  totals: { subtotal: number; discount_total: number; total: number };
  onCancel: () => void;
  onConfirm: () => void;
  onPrintSizeChange: (size: ReceiptPrintSize) => void;
}) {
  const pieces = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <ModalOverlay role="alertdialog">
      <div className="animate-pop w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{editing ? "Confirmar edicion" : "Confirmar venta"}</h2>
          <p className="text-sm text-muted-foreground">
            Revisa resumen antes de {editing ? "guardar cambios" : "finalizar venta"}. Se ajustara inventario y quedara registro.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-sm">
            <SummaryRow label="Articulos" value={`${cart.length}`} />
            <SummaryRow label="Piezas" value={`${pieces}`} />
            <SummaryRow label="Subtotal" value={money(totals.subtotal)} />
            <SummaryRow label="Descuento" value={money(totals.discount_total)} />
            <SummaryRow label="Total" value={money(totals.total)} strong />
            <SummaryRow label="Recibido" value={money(paidTotal)} strong />
            {changeDue > 0 ? <SummaryRow label="Cambio" value={money(changeDue)} strong /> : null}
            {missing > 0 ? <SummaryRow label={allowDebt ? "Deuda" : "Faltante"} value={money(missing)} strong /> : null}
          </div>
          {missing > 0 && allowDebt ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Saldo pendiente se guardara en Deudores.
            </p>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Pagos</h3>
            {payments.map((payment) => (
              <div key={payment.key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{paymentOptions.find((method) => method.id === payment.payment_method_id)?.name ?? "Metodo"}</span>
                <span className="font-medium">{money(parseMoneyInput(payment.amount_received))}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Formato ticket</Label>
            <Select value={printSize} onChange={(event) => onPrintSizeChange(event.target.value as ReceiptPrintSize)}>
              <option value="thermal-80">Termica 80 mm</option>
              <option value="standard">Carta / impresora normal</option>
            </Select>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={submitPending} type="button" variant="secondary" onClick={onCancel}>
            Revisar
          </Button>
          <Button disabled={submitPending || (missing > 0 && !allowDebt)} type="button" onClick={onConfirm}>
            <Save className="h-4 w-4" />
            {submitPending ? "Guardando..." : editing ? "Guardar cambios" : "Finalizar venta"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function RefundPanel({
  initialSaleNumber,
  paymentMethods,
  onRefunded,
}: {
  initialSaleNumber: string;
  paymentMethods: CatalogItem[];
  onRefunded: () => void;
}) {
  const [saleNumber, setSaleNumber] = useState(initialSaleNumber);
  const [sale, setSale] = useState<Sale | null>(null);
  const [quantities, setQuantities] = useState<RefundQuantities>({});
  const [paymentOptions, setPaymentOptions] = useState(paymentMethods);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [comments, setComments] = useState("");
  const [affectInventory, setAffectInventory] = useState(true);
  const [pending, startTransition] = useTransition();

  const computedAmount = useMemo(() => roundMoney((sale?.items ?? []).reduce((total, item) => {
    const quantity = quantities[item.id] ?? 0;
    return total + (item.line_total / item.quantity) * quantity;
  }, 0)), [quantities, sale]);
  const refundAmount = manualAmount === "" ? computedAmount : parseMoneyInput(manualAmount);
  const selectedRefundItems = useMemo(() => (sale?.items ?? [])
    .map((item) => {
      const quantity = quantities[item.id] ?? 0;
      const unitRefund = roundMoney(item.line_total / item.quantity);
      return {
        item,
        quantity,
        unitRefund,
        amount: roundMoney(unitRefund * quantity),
      };
    })
    .filter((entry) => entry.quantity > 0), [quantities, sale]);
  const refundDifference = roundMoney(refundAmount - computedAmount);

  useEffect(() => {
    if (!initialSaleNumber) return;
    loadSale(initialSaleNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSaleNumber]);

  function loadSale(nextSaleNumber = saleNumber) {
    startTransition(async () => {
      try {
        const data = await getSaleByNumber(nextSaleNumber);
        setSale(data);
        setSaleNumber(data.sale_number);
        setQuantities(Object.fromEntries((data.items ?? []).map((item) => [item.id, 0])));
        setPaymentMethodId(data.payments?.[0]?.payment_method_id ?? "");
        setManualAmount("");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se encontro venta");
      }
    });
  }

  function setAll() {
    if (!sale) return;
    setQuantities(Object.fromEntries((sale.items ?? []).map((item) => [item.id, item.quantity - item.refunded_quantity])));
  }

  function submitRefund() {
    if (!sale) return;
    startTransition(async () => {
      try {
        await refundSale({
          sale_id: sale.id,
          payment_method_id: paymentMethodId,
          amount: refundAmount,
          affect_inventory: affectInventory,
          comments,
          items: (sale.items ?? []).map((item) => ({ sale_item_id: item.id, quantity: quantities[item.id] ?? 0 })),
        });
        toast.success("Reembolso registrado");
        onRefunded();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo reembolsar");
      }
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Reembolso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_150px]">
            <Input placeholder="S-000001" value={saleNumber} onChange={(event) => setSaleNumber(event.target.value.toUpperCase())} />
            <Button disabled={pending || !saleNumber.trim()} type="button" onClick={() => loadSale()}>
              <PackageSearch className="h-4 w-4" />
              Buscar
            </Button>
          </div>
          {sale ? (
            <div className="space-y-4">
              <SaleHeader sale={sale} />
              <div className="flex justify-end">
                <Button type="button" size="sm" variant="secondary" onClick={setAll}>
                  <RotateCcw className="h-4 w-4" />
                  Devolver todo
                </Button>
              </div>
              <div className="space-y-3">
                {(sale.items ?? []).map((item) => {
                  const available = item.quantity - item.refunded_quantity;
                  return (
                    <div key={item.id} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_120px_140px] md:items-end">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.product_code} · Disponible reembolso {available}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Cantidad</Label>
                        <Input min={0} max={available} type="number" value={quantities[item.id] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.min(available, Math.max(0, Number(event.target.value))) }))} />
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Monto</p>
                        <p className="font-semibold">{money(roundMoney((item.line_total / item.quantity) * (quantities[item.id] ?? 0)))}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen reembolso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Metodo devolucion</Label>
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
            <Label>Monto a devolver</Label>
            <MoneyInput placeholder={String(computedAmount)} value={manualAmount} onChange={(value) => setManualAmount(value)} />
          </div>
          <RefundSummaryPreview
            computedAmount={computedAmount}
            difference={refundDifference}
            refundAmount={refundAmount}
            selectedItems={selectedRefundItems}
          />
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm">
            <input checked={affectInventory} type="checkbox" onChange={(event) => setAffectInventory(event.target.checked)} />
            Afectar inventario
          </label>
          <div className="space-y-2">
            <Label>Comentarios</Label>
            <Textarea value={comments} onChange={(event) => setComments(event.target.value)} />
          </div>
          <SummaryRow label="Calculado" value={money(computedAmount)} />
          <SummaryRow label="Devolver" value={money(refundAmount)} strong />
          <Button className="w-full" disabled={pending || !sale || !paymentMethodId || computedAmount <= 0 || refundAmount > computedAmount} type="button" onClick={submitRefund}>
            <CreditCard className="h-4 w-4" />
            {pending ? "Registrando..." : "Registrar reembolso"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function RefundSummaryPreview({
  computedAmount,
  difference,
  refundAmount,
  selectedItems,
}: {
  computedAmount: number;
  difference: number;
  refundAmount: number;
  selectedItems: { item: SaleItem; quantity: number; unitRefund: number; amount: number }[];
}) {
  if (selectedItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        Selecciona piezas para ver resumen de devolucion.
      </div>
    );
  }

  const totalPieces = selectedItems.reduce((total, entry) => total + entry.quantity, 0);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Resumen seleccionado</p>
          <p className="text-xs text-muted-foreground">
            {totalPieces} pieza{totalPieces === 1 ? "" : "s"} para devolver
          </p>
        </div>
        <Badge variant={difference === 0 ? "secondary" : difference < 0 ? "warning" : "destructive"}>
          {difference === 0 ? "Completo" : "Ajustado"}
        </Badge>
      </div>

      <div className="space-y-2">
        {selectedItems.map(({ amount, item, quantity, unitRefund }) => (
          <div key={item.id} className="rounded-md bg-card px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">{item.product_code}</p>
              </div>
              <p className="shrink-0 font-semibold">{money(amount)}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {quantity} pz x {money(unitRefund)}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t border-border pt-3">
        <SummaryRow label="Calculado por piezas" value={money(computedAmount)} />
        <SummaryRow label="Monto capturado" value={money(refundAmount)} strong />
        {difference !== 0 ? (
          <SummaryRow
            label={difference < 0 ? "Diferencia a favor negocio" : "Extra devuelto"}
            value={money(Math.abs(difference))}
          />
        ) : null}
      </div>
    </div>
  );
}

function SaleDetailPanel({ saleNumber, onCanceled }: { saleNumber: string; onCanceled: () => void }) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      try {
        setSale(await getSaleByNumber(saleNumber));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cargar detalle");
      }
    });
  }, [saleNumber]);

  function submitCancel() {
    if (!sale) return;
    if (!note.trim()) {
      toast.error("Motivo requerido para cancelar; se guardara en historial");
      return;
    }
    setCancelConfirmOpen(true);
  }

  function confirmCancel() {
    if (!sale) return;
    startTransition(async () => {
      try {
        await cancelSale({ sale_id: sale.id, note });
        setCancelConfirmOpen(false);
        toast.success("Venta cancelada");
        onCanceled();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cancelar");
      }
    });
  }

  if (pending && !sale) return <Card><CardContent className="pt-5 text-sm text-muted-foreground">Cargando detalle...</CardContent></Card>;
  if (!sale) return null;

  const canCancel = sale.status !== "canceled" && sale.status !== "refunded";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Detalle venta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SaleHeader sale={sale} />
          <div className="space-y-2">
            {(sale.items ?? []).map((item) => {
              const returned = item.refunded_quantity;
              const kept = item.quantity - returned;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_100px_120px_120px]",
                    returned > 0 && "border-amber-200 bg-amber-50/60 dark:border-amber-900/70 dark:bg-amber-950/20",
                  )}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.product_name}</p>
                      {returned > 0 ? <Badge variant="warning">{returned} devuelta{returned === 1 ? "" : "s"}</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.product_code}</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">{item.quantity} pz</p>
                    {returned > 0 ? <p className="text-xs text-muted-foreground">{kept} quedan venta</p> : null}
                  </div>
                  <p>{money(item.unit_price)}</p>
                  <p className="font-semibold">{money(item.line_total)}</p>
                </div>
              );
            })}
          </div>
          <RefundHistory sale={sale} />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Eventos</h3>
            {(sale.events ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Sin eventos.</p> : null}
            {(sale.events ?? []).map((event) => (
              <div key={event.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{event.type} · {formatDate(event.created_at)}</p>
                <p className="text-muted-foreground">{event.note || "Sin nota"}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pagos y cancelacion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(sale.payments ?? []).map((payment) => (
            <div key={payment.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{payment.payment_method_name}</p>
              <p className="text-muted-foreground">Recibido {money(payment.amount_received)} · Aplicado {money(payment.amount_paid)}</p>
              {payment.comments ? <p className="mt-1">{payment.comments}</p> : null}
            </div>
          ))}
          <SummaryRow label="Subtotal" value={money(sale.subtotal)} />
          <SummaryRow label="Descuento" value={money(sale.discount_total)} />
          <SummaryRow label="Total" value={money(sale.total)} strong />
          {canCancel ? (
            <>
              <div className="space-y-2">
                <Label>Motivo cancelacion</Label>
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
              </div>
              <Button className="w-full" disabled={pending} type="button" variant="destructive" onClick={submitCancel}>
                <Ban className="h-4 w-4" />
                Cancelar venta
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
      {cancelConfirmOpen ? (
        <CancelSaleConfirmModal
          note={note}
          pending={pending}
          sale={sale}
          onCancel={() => setCancelConfirmOpen(false)}
          onConfirm={confirmCancel}
        />
      ) : null}
    </div>
  );
}

function RefundHistory({ sale }: { sale: Sale }) {
  const refunds = sale.refunds ?? [];
  if (refunds.length === 0) return null;

  const itemsById = new Map((sale.items ?? []).map((item) => [item.id, item]));
  const totalRefunded = refunds.reduce((total, refund) => total + Number(refund.amount), 0);
  const totalCalculated = refunds.reduce(
    (total, refund) => total + (refund.items ?? []).reduce((sum, item) => sum + Number(item.amount), 0),
    0,
  );
  const totalDifference = roundMoney(totalCalculated - totalRefunded);
  const totalPieces = refunds.reduce(
    (total, refund) => total + (refund.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    0,
  );

  return (
    <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/70 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Devoluciones</h3>
          <p className="text-xs text-muted-foreground">
            {totalPieces} pieza{totalPieces === 1 ? "" : "s"} devuelta{totalPieces === 1 ? "" : "s"} · {money(totalRefunded)}
          </p>
          {totalDifference !== 0 ? (
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              {totalDifference > 0 ? "Diferencia a favor negocio" : "Extra devuelto"}: {money(Math.abs(totalDifference))}
            </p>
          ) : null}
        </div>
        <Badge variant={sale.status === "refunded" ? "destructive" : "warning"}>
          {sale.status === "refunded" ? "Venta reembolsada" : "Reembolso parcial"}
        </Badge>
      </div>

      <div className="space-y-2">
        {refunds.map((refund) => {
          const pieces = (refund.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
          const calculated = roundMoney((refund.items ?? []).reduce((sum, item) => sum + Number(item.amount), 0));
          const refunded = Number(refund.amount);
          const difference = roundMoney(calculated - refunded);

          return (
            <div key={refund.id} className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {formatDate(refund.created_at)} · {pieces} pieza{pieces === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {refund.payment_method_name} · {refund.affect_inventory ? "Inventario actualizado" : "Sin mover inventario"}
                  </p>
                </div>
                <p className="font-semibold">{money(Number(refund.amount))}</p>
              </div>

              <RefundMoneyFlow calculated={calculated} difference={difference} refunded={refunded} />

              <div className="mt-3 space-y-2">
                {(refund.items ?? []).map((refundItem) => {
                  const saleItem = itemsById.get(refundItem.sale_item_id);

                  return (
                    <div key={refundItem.id} className="grid gap-1 rounded-md bg-muted/35 px-3 py-2 sm:grid-cols-[1fr_80px_100px] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{saleItem?.product_name ?? "Producto"}</p>
                        <p className="text-xs text-muted-foreground">{saleItem?.product_code ?? "Sin codigo"}</p>
                      </div>
                      <p className="font-medium">{refundItem.quantity} pz</p>
                      <p className="font-semibold sm:text-right">{money(Number(refundItem.amount))}</p>
                    </div>
                  );
                })}
              </div>

              {refund.comments ? <p className="mt-3 rounded-md bg-muted/35 px-3 py-2 text-muted-foreground">{refund.comments}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RefundMoneyFlow({
  calculated,
  difference,
  refunded,
}: {
  calculated: number;
  difference: number;
  refunded: number;
}) {
  const hasBusinessRetention = difference > 0;
  const hasExtraRefund = difference < 0;

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Valor piezas</p>
          <p className="mt-1 text-base font-semibold">{money(calculated)}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/70 dark:bg-red-950/25">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <WalletCards className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase">Devuelto al cliente</p>
          </div>
          <p className="mt-1 text-base font-semibold text-red-700 dark:text-red-300">{money(refunded)}</p>
        </div>
      </div>

      {difference !== 0 ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-3",
            hasBusinessRetention && "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200",
            hasExtraRefund && "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <TrendingUp className={cn("mt-0.5 h-4 w-4 shrink-0", hasExtraRefund && "rotate-180")} />
              <div>
                <p className="text-xs font-semibold uppercase">
                  {hasBusinessRetention ? "Se queda en negocio" : "Extra devuelto"}
                </p>
                <p className="mt-1 text-xs opacity-85">
                  {hasBusinessRetention
                    ? "Diferencia entre valor de piezas y dinero entregado al cliente."
                    : "Monto entregado mayor al valor calculado de piezas."}
                </p>
              </div>
            </div>
            <p className="shrink-0 text-xl font-bold">{money(Math.abs(difference))}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          Devolucion completa: no queda diferencia.
        </div>
      )}
    </div>
  );
}

function CancelSaleConfirmModal({
  note,
  pending,
  sale,
  onCancel,
  onConfirm,
}: {
  note: string;
  pending: boolean;
  sale: Sale;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const pieces = (sale.items ?? []).reduce((total, item) => total + item.quantity, 0);

  return (
    <ModalOverlay aria-describedby={descriptionId} aria-labelledby={titleId} role="alertdialog">
      <div className="animate-pop w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 id={titleId} className="text-lg font-semibold">
              Cancelar venta
            </h2>
            <p id={descriptionId} className="text-sm text-muted-foreground">
              Se regresaran piezas a inventario y se guardara evento con motivo.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-sm">
            <SummaryRow label="Venta" value={sale.sale_number} />
            <SummaryRow label="Total" value={money(sale.total)} strong />
            <SummaryRow label="Articulos" value={`${(sale.items ?? []).length}`} />
            <SummaryRow label="Piezas" value={`${pieces}`} />
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
            <p className="font-medium text-destructive">Motivo</p>
            <p className="mt-1 text-muted-foreground">{note.trim()}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={pending} type="button" variant="secondary" onClick={onCancel}>
            Revisar
          </Button>
          <Button disabled={pending} type="button" variant="destructive" onClick={onConfirm}>
            <Ban className="h-4 w-4" />
            {pending ? "Cancelando..." : "Confirmar cancelacion"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function SaleHeader({ sale }: { sale: Sale }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div>
        <p className="font-semibold">{sale.sale_number}</p>
        <p className="text-sm text-muted-foreground">{sale.customers?.name ?? "Cliente general"} · {money(sale.total)}</p>
      </div>
      <Badge variant={sale.status === "completed" ? "success" : sale.status === "canceled" ? "destructive" : "warning"}>{saleStatusLabel(sale.status)}</Badge>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex items-center justify-between text-base font-semibold" : "flex items-center justify-between text-sm"}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function emptyPayment(): PaymentLine {
  return { key: newClientKey(), payment_method_id: "", amount_received: "", comments: "" };
}

function paymentSummary(sale: Sale) {
  const payments = sale.payments ?? [];
  if (payments.length === 0) return "Sin pago";
  if (payments.length === 1) return payments[0].payment_method_name;
  return `${payments.length} pagos`;
}

function saleStatusLabel(status: Sale["status"]) {
  const labels: Record<Sale["status"], string> = {
    completed: "Completada",
    with_debt: "Con deuda",
    partially_refunded: "Parcial",
    refunded: "Reembolsada",
    canceled: "Cancelada",
  };
  return labels[status];
}

function saleItemProduct(item: NonNullable<Sale["items"]>[number]) {
  return {
    id: item.product_id,
    tenant_id: item.tenant_id,
    internal_code: item.product_code,
    name: item.product_name,
    brand: null,
    model: null,
    category: null,
    variant: null,
    brand_id: null,
    model_id: null,
    category_id: null,
    variant_id: null,
    cost: 0,
    sale_price: item.unit_price,
    suggested_price: item.suggested_price,
    current_stock: (item.products?.current_stock ?? 0) + item.quantity,
    minimum_stock: 0,
    properties: {},
    primary_supplier_id: null,
    notes: null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  } satisfies Product;
}

function toCalculationItem(item: CartItem) {
  return {
    quantity: item.quantity,
    unit_price: item.unit_price,
    discount: item.discount,
  };
}
