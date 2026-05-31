"use client";

import { Ban, CreditCard, Edit, Eye, PackageSearch, Plus, Receipt, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { discountAmount, lineSubtotal, lineTotal, roundMoney, saleTotals } from "@/features/sales/calculations";
import { formatDate, money } from "@/lib/utils";
import { createCatalogItem } from "@/services/catalogs";
import { createCustomer } from "@/services/customers";
import { cancelSale, createSale, getSaleByNumber, refundSale, searchSaleProducts, updateSale } from "@/services/sales";
import type { CatalogItem, Customer, DiscountType, Product, Sale } from "@/types/database";

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

export function SalesView({
  catalogs,
  customers,
  sales,
}: {
  catalogs: CatalogItem[];
  customers: Customer[];
  sales: Sale[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("history");
  const [activeSaleNumber, setActiveSaleNumber] = useState("");
  const categories = catalogs.filter((item) => item.kind === "category");
  const paymentMethods = catalogs.filter((item) => item.kind === "payment_method");

  function closePanel() {
    setMode("history");
    setActiveSaleNumber("");
    router.refresh();
  }

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
          <Button type="button" onClick={() => {
            setActiveSaleNumber("");
            setMode("sale");
          }}>
            <Receipt className="h-4 w-4" />
            Nueva venta
          </Button>
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
        />
      ) : null}

      {mode === "sale" ? (
        <SalePanel
          key={activeSaleNumber || "new-sale"}
          categories={categories}
          customers={customers}
          initialSaleNumber={activeSaleNumber}
          paymentMethods={paymentMethods}
          onSaved={closePanel}
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
    </div>
  );
}

function SalesHistory({
  sales,
  onCancel,
  onDetail,
  onEdit,
  onRefund,
}: {
  sales: Sale[];
  onCancel: (saleNumber: string) => void;
  onDetail: (saleNumber: string) => void;
  onEdit: (saleNumber: string) => void;
  onRefund: (saleNumber: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de ventas</CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
            <Receipt className="mb-2 h-6 w-6" />
            Aun no hay ventas registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Folio</th>
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3">Pago</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 pr-3 font-mono text-xs">{sale.sale_number}</td>
                    <td className="py-3 pr-3">{formatDate(sale.created_at)}</td>
                    <td className="py-3 pr-3">{sale.customers?.name ?? "Cliente general"}</td>
                    <td className="py-3 pr-3">{paymentSummary(sale)}</td>
                    <td className="py-3 pr-3 text-right font-semibold">{money(sale.total)}</td>
                    <td className="py-3 pr-3"><Badge variant={sale.status === "completed" ? "success" : sale.status === "canceled" ? "destructive" : "warning"}>{saleStatusLabel(sale.status)}</Badge></td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <Button aria-label="Ver detalle" size="icon" type="button" variant="ghost" onClick={() => onDetail(sale.sale_number)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button aria-label="Editar venta" disabled={sale.status !== "completed"} size="icon" type="button" variant="ghost" onClick={() => onEdit(sale.sale_number)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button aria-label="Reembolso" disabled={sale.status === "refunded" || sale.status === "canceled"} size="icon" type="button" variant="ghost" onClick={() => onRefund(sale.sale_number)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button aria-label="Cancelar venta" disabled={sale.status === "canceled" || sale.status === "refunded"} size="icon" type="button" variant="ghost" onClick={() => onCancel(sale.sale_number)}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SalePanel({
  categories,
  customers,
  initialSaleNumber,
  paymentMethods,
  onSaved,
}: {
  categories: CatalogItem[];
  customers: Customer[];
  initialSaleNumber: string;
  paymentMethods: CatalogItem[];
  onSaved: () => void;
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
      const price = Number(product.suggested_price ?? product.sale_price ?? 0);
      const next = {
        key: crypto.randomUUID(),
        product,
        quantity: 1,
        suggested_price: price,
        unit_price: price,
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

  function submitSale() {
    if (editing && !editNote.trim()) {
      toast.error("Motivo requerido para editar; se guardara en historial");
      return;
    }
    if (editing && !window.confirm("Editar esta venta ajustara inventario y guardara registro. Continuar?")) return;

    startSubmit(async () => {
      try {
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
          toast.success("Venta actualizada");
        } else {
          const saleNumber = await createSale(payload);
          toast.success(`Venta ${saleNumber} creada`);
        }
        onSaved();
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
        <Card>
          <CardHeader>
            <CardTitle>{editing ? `Editar ${initialSaleNumber}` : "Agregar productos"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadPending ? <p className="text-sm text-muted-foreground">Cargando venta...</p> : null}
            <div className="grid gap-3 md:grid-cols-[1fr_240px]">
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
            <p className="text-xs text-muted-foreground">Busca por codigo, nombre, marca o modelo. Minimo 3 letras; con categoria lista disponibles.</p>
          </CardContent>
        </Card>

        <Card>
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
              <div className="space-y-3">
                {cart.map((item) => {
                  const selected = activeKey === item.key;
                  const subtotal = lineSubtotal(item);
                  const itemDiscount = discountAmount(subtotal, item.discount);
                  return (
                    <div key={item.key} className={selected ? "rounded-lg border border-primary bg-accent p-3" : "rounded-lg border border-border p-3"}>
                      <div className="grid gap-3 lg:grid-cols-[1fr_100px_130px_130px_110px_44px] lg:items-end">
                        <button className="cursor-pointer text-left" type="button" onClick={() => setActiveKey(item.key)}>
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
                        <div className="space-y-1 text-sm">
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

      <div className="space-y-5">
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
            <CardTitle>Cobro</CardTitle>
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
                  <Input placeholder={`Comentario pago ${index + 1}`} value={payment.comments} onChange={(event) => updatePayment(payment.key, { comments: event.target.value })} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Comentarios venta</Label>
              <Textarea value={comments} onChange={(event) => setComments(event.target.value)} />
            </div>
            {editing ? (
              <div className="space-y-2">
                <Label>Motivo de edicion</Label>
                <Textarea value={editNote} onChange={(event) => setEditNote(event.target.value)} />
              </div>
            ) : null}
            <SummaryRow label="Subtotal" value={money(totals.subtotal)} />
            <SummaryRow label="Descuento venta" value={money(totals.discount_total)} />
            <SummaryRow label="Total" value={money(totals.total)} strong />
            <SummaryRow label="Recibido" value={money(paidTotal)} />
            {missing > 0 ? (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p>Faltan {money(missing)} para completar venta.</p>
                <label className="flex cursor-pointer items-center gap-2">
                  <input checked={allowDebt} type="checkbox" onChange={(event) => setAllowDebt(event.target.checked)} />
                  Quedar a deber al cliente
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
          allowDebt={allowDebt}
          submitPending={submitPending}
          totals={totals}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            submitSale();
          }}
        />
      ) : null}
    </div>
  );
}

function ProductSearchBox({ categoryId, onSelect }: { categoryId: string; onSelect: (product: Product) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [pending, startTransition] = useTransition();
  const cache = useRef(new Map<string, Product[]>());
  const canSearch = query.trim().length >= 3 || Boolean(categoryId);

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
    <div>
      <Input
        autoComplete="off"
        placeholder="Buscar producto"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
      />
      {open ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-sm">
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
                <span className="shrink-0 font-medium">{money(Number(product.suggested_price ?? product.sale_price ?? 0))}</span>
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
  submitPending,
  totals,
  onCancel,
  onConfirm,
}: {
  allowDebt: boolean;
  cart: CartItem[];
  changeDue: number;
  editing: boolean;
  missing: number;
  paidTotal: number;
  payments: PaymentLine[];
  paymentOptions: CatalogItem[];
  submitPending: boolean;
  totals: { subtotal: number; discount_total: number; total: number };
  onCancel: () => void;
  onConfirm: () => void;
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
            <MoneyInput value={manualAmount === "" ? computedAmount : manualAmount} onChange={(value) => setManualAmount(value)} />
          </div>
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

function SaleDetailPanel({ saleNumber, onCanceled }: { saleNumber: string; onCanceled: () => void }) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");

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
    if (!window.confirm("Cancelar esta venta ajustara inventario y guardara registro. Continuar?")) return;
    startTransition(async () => {
      try {
        await cancelSale({ sale_id: sale.id, note });
        toast.success("Venta cancelada");
        onCanceled();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cancelar");
      }
    });
  }

  if (pending && !sale) return <Card><CardContent className="pt-5 text-sm text-muted-foreground">Cargando detalle...</CardContent></Card>;
  if (!sale) return null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Detalle venta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SaleHeader sale={sale} />
          <div className="space-y-2">
            {(sale.items ?? []).map((item) => (
              <div key={item.id} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_80px_120px_120px]">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{item.product_code}</p>
                </div>
                <p>{item.quantity} pz</p>
                <p>{money(item.unit_price)}</p>
                <p className="font-semibold">{money(item.line_total)}</p>
              </div>
            ))}
          </div>
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
          {sale.status !== "canceled" && sale.status !== "refunded" ? (
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
    </div>
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
  return { key: crypto.randomUUID(), payment_method_id: "", amount_received: "", comments: "" };
}

function MoneyInput({ value, onChange }: { value: number | string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input
        className="pl-7"
        inputMode="decimal"
        value={formatMoneyInput(value)}
        onChange={(event) => onChange(cleanMoneyInput(event.target.value))}
        onFocus={(event) => {
          if (parseMoneyInput(event.currentTarget.value) === 0) onChange("");
          window.setTimeout(() => event.currentTarget.select(), 0);
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

function formatMoneyInput(value: number | string) {
  if (typeof value === "number") return value === 0 ? "" : String(value);
  return value;
}

function parseMoneyInput(value: number | string) {
  const numeric = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
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
