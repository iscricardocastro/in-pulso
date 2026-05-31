"use server";

import { revalidatePath } from "next/cache";
import { cancelSaleSchema, createSaleSchema, refundSaleSchema, updateSaleSchema } from "@/features/sales/schemas";
import { discountAmount, lineSubtotal, lineTotal, roundMoney, saleTotals } from "@/features/sales/calculations";
import { requireUserContext } from "@/services/context";
import type { CatalogItem, Product, Sale, SaleItem, SaleStatus } from "@/types/database";

export async function getSales(limit = 100) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("sales")
    .select("*, customers(id, name, phone, email), payments:sale_payments(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Sale[];
}

export async function searchSaleProducts(query: string, categoryId?: string | null) {
  const { supabase } = await requireUserContext();
  const cleanQuery = query.trim();
  const hasText = cleanQuery.length >= 3;
  const hasCategory = Boolean(categoryId);
  if (!hasText && !hasCategory) return [];

  let request = supabase
    .from("products")
    .select(`
      *,
      brand_item:catalog_items!products_brand_id_fkey(id, name, parent_id),
      model_item:catalog_items!products_model_id_fkey(id, name, parent_id),
      category_item:catalog_items!products_category_id_fkey(id, name, parent_id),
      variant_item:catalog_items!products_variant_id_fkey(id, name, parent_id)
    `)
    .gt("current_stock", 0)
    .order("name", { ascending: true })
    .limit(20);

  if (hasCategory) request = request.eq("category_id", categoryId);
  if (hasText) {
    const pattern = `%${cleanQuery}%`;
    request = request.or(`name.ilike.${pattern},internal_code.ilike.${pattern},brand.ilike.${pattern},model.ilike.${pattern},category.ilike.${pattern}`);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function createSale(input: unknown) {
  const { profile } = await requireUserContext();
  const values = createSaleSchema.parse(input);
  const sale = await persistSale({
    values,
    tenantId: profile.tenant_id,
    userId: profile.id,
  });
  await createSaleEvent({
    tenantId: profile.tenant_id,
    userId: profile.id,
    saleId: sale.id,
    type: "created",
    note: values.comments,
    metadata: { total: sale.total },
  });
  revalidateSalesPaths();
  return sale.sale_number as string;
}

export async function updateSale(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = updateSaleSchema.parse(input);
  const current = await getSaleById(values.sale_id);
  if (current.status !== "completed") throw new Error("Solo ventas completadas se pueden editar");
  if ((current.items ?? []).some((item) => item.refunded_quantity > 0)) throw new Error("Venta con reembolsos no se puede editar");

  const existingQuantities = new Map<string, number>();
  (current.items ?? []).forEach((item) => existingQuantities.set(item.product_id, (existingQuantities.get(item.product_id) ?? 0) + item.quantity));
  const nextData = await prepareSale(values, existingQuantities);
  await applyInventoryDiff(current.items ?? [], nextData.calculatedItems, current.sale_number);

  const { error: saleError } = await supabase
    .from("sales")
    .update({
      customer_id: values.customer_id || null,
      comments: values.comments || null,
      subtotal: nextData.totals.subtotal,
      discount_type: values.discount?.type ?? null,
      discount_value: values.discount?.value ?? 0,
      discount_total: nextData.totals.discount_total,
      total: nextData.totals.total,
      paid_total: nextData.paidTotal,
      balance_due: nextData.balanceDue,
      status: nextData.balanceDue > 0 ? "with_debt" : "completed",
    })
    .eq("id", values.sale_id);
  if (saleError) throw new Error(saleError.message);

  const { error: deleteItemsError } = await supabase.from("sale_items").delete().eq("sale_id", values.sale_id);
  if (deleteItemsError) throw new Error(deleteItemsError.message);
  const { error: deletePaymentsError } = await supabase.from("sale_payments").delete().eq("sale_id", values.sale_id);
  if (deletePaymentsError) throw new Error(deletePaymentsError.message);

  await insertSaleItems(values.sale_id, profile.tenant_id, nextData.calculatedItems);
  await insertSalePayments(values.sale_id, profile.tenant_id, nextData.paymentMethods, values.payments, nextData.totals.total);
  await upsertDebtForSale({
    tenantId: profile.tenant_id,
    saleId: values.sale_id,
    customerId: values.customer_id || null,
    balanceDue: nextData.balanceDue,
    paidTotal: nextData.paidTotal,
    note: values.comments,
  });
  await createSaleEvent({
    tenantId: profile.tenant_id,
    userId: profile.id,
    saleId: values.sale_id,
    type: "updated",
    note: values.note,
    metadata: { previous_total: current.total, next_total: nextData.totals.total },
  });

  revalidateSalesPaths();
}

export async function cancelSale(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = cancelSaleSchema.parse(input);
  const sale = await getSaleById(values.sale_id);
  if (sale.status === "canceled") throw new Error("Venta ya cancelada");
  if (sale.status === "refunded") throw new Error("Venta ya reembolsada");

  for (const item of sale.items ?? []) {
    const quantity = item.quantity - item.refunded_quantity;
    if (quantity <= 0) continue;
    const { error } = await supabase.rpc("record_inventory_movement", {
      p_product_id: item.product_id,
      p_type: "entry",
      p_quantity: quantity,
      p_comment: `Cancelacion venta ${sale.sale_number}: ${values.note}`,
    });
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase.from("sales").update({ status: "canceled" }).eq("id", sale.id);
  if (error) throw new Error(error.message);
  await createSaleEvent({
    tenantId: profile.tenant_id,
    userId: profile.id,
    saleId: sale.id,
    type: "canceled",
    note: values.note,
    metadata: { returned_inventory: true },
  });
  revalidateSalesPaths();
}

async function persistSale({
  values,
  tenantId,
  userId,
}: {
  values: ReturnType<typeof createSaleSchema.parse>;
  tenantId: string;
  userId: string;
}) {
  const nextData = await prepareSale(values);
  const sale = await insertSaleWithNextNumber({
    tenantId,
    userId,
    customerId: values.customer_id || null,
    comments: values.comments || null,
    subtotal: nextData.totals.subtotal,
    discountType: values.discount?.type ?? null,
    discountValue: values.discount?.value ?? 0,
    discountTotal: nextData.totals.discount_total,
    total: nextData.totals.total,
    paidTotal: nextData.paidTotal,
    balanceDue: nextData.balanceDue,
    status: nextData.balanceDue > 0 ? "with_debt" : "completed",
  });

  await insertSaleItems(sale.id, tenantId, nextData.calculatedItems);
  await insertSalePayments(sale.id, tenantId, nextData.paymentMethods, values.payments, nextData.totals.total);
  await upsertDebtForSale({
    tenantId,
    saleId: sale.id,
    customerId: values.customer_id || null,
    balanceDue: nextData.balanceDue,
    paidTotal: nextData.paidTotal,
    note: values.comments,
  });

  const { supabase } = await requireUserContext();
  for (const item of nextData.calculatedItems) {
    const { error } = await supabase.rpc("record_inventory_movement", {
      p_product_id: item.product.id,
      p_type: "exit",
      p_quantity: item.input.quantity,
      p_comment: `Venta ${sale.sale_number}`,
    });
    if (error) throw new Error(error.message);
  }

  return { ...sale, total: nextData.totals.total };
}

async function prepareSale(values: ReturnType<typeof createSaleSchema.parse>, existingQuantities = new Map<string, number>()) {
  const { supabase } = await requireUserContext();
  const ids = Array.from(new Set(values.items.map((item) => item.product_id)));

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, internal_code, current_stock, sale_price, suggested_price")
    .in("id", ids);
  if (productsError) throw new Error(productsError.message);

  const productMap = new Map((products ?? []).map((product) => [product.id, product as Product]));
  const paymentMethods = await Promise.all(values.payments.map((payment) => getPaymentMethod(payment.payment_method_id)));
  const calculatedItems = values.items.map((item) => {
    const product = productMap.get(item.product_id);
    if (!product) throw new Error("Producto invalido");
    const available = product.current_stock + (existingQuantities.get(item.product_id) ?? 0);
    if (item.quantity > available) throw new Error(`${product.name}: stock insuficiente`);
    const subtotal = lineSubtotal(item);
    const itemDiscount = discountAmount(subtotal, item.discount);
    return {
      input: item,
      product,
      subtotal,
      discount_total: itemDiscount,
      line_total: lineTotal(item),
    };
  });
  const totals = saleTotals(values.items, values.discount);
  const received = values.payments.reduce((total, payment) => total + payment.amount_received, 0);
  const paidTotal = roundMoney(Math.min(received, totals.total));
  const balanceDue = roundMoney(Math.max(0, totals.total - paidTotal));
  if (balanceDue > 0 && !values.allow_debt) throw new Error("Monto recibido menor al total");
  if (balanceDue > 0 && !values.customer_id) throw new Error("Selecciona cliente para dejar deuda");
  return { calculatedItems, paymentMethods, totals, paidTotal, balanceDue };
}

async function insertSaleItems(
  saleId: string,
  tenantId: string,
  calculatedItems: {
    input: { product_id: string; quantity: number; suggested_price: number; unit_price: number; discount?: { type?: "amount" | "percent" | null; value?: number } };
    product: Product;
    discount_total: number;
    line_total: number;
  }[],
) {
  const { supabase } = await requireUserContext();
  const saleItems = calculatedItems.map((item) => ({
    tenant_id: tenantId,
    sale_id: saleId,
    product_id: item.product.id,
    product_name: item.product.name,
    product_code: item.product.internal_code,
    quantity: item.input.quantity,
    suggested_price: item.input.suggested_price,
    unit_price: item.input.unit_price,
    discount_type: item.input.discount?.type ?? null,
    discount_value: item.input.discount?.value ?? 0,
    discount_total: item.discount_total,
    line_total: item.line_total,
  }));

  const { error: itemError } = await supabase.from("sale_items").insert(saleItems);
  if (itemError) throw new Error(itemError.message);
}

async function insertSalePayments(
  saleId: string,
  tenantId: string,
  paymentMethods: CatalogItem[],
  payments: { payment_method_id: string; amount_received: number; comments?: string }[],
  total: number,
) {
  const { supabase } = await requireUserContext();
  if (payments.length === 0) return;
  let remaining = total;
  const rows = payments.map((payment, index) => {
    const method = paymentMethods[index];
    const paid = roundMoney(Math.min(payment.amount_received, remaining));
    remaining = roundMoney(Math.max(0, remaining - paid));
    return {
      tenant_id: tenantId,
      sale_id: saleId,
      payment_method_id: method.id,
      payment_method_name: method.name,
      amount_paid: paid,
      amount_received: payment.amount_received,
      change_due: remaining === 0 ? roundMoney(Math.max(0, payment.amount_received - paid)) : 0,
      comments: payment.comments || null,
    };
  });
  const { error: paymentError } = await supabase.from("sale_payments").insert(rows);
  if (paymentError) throw new Error(paymentError.message);
}

async function upsertDebtForSale({
  tenantId,
  saleId,
  customerId,
  balanceDue,
  paidTotal,
  note,
}: {
  tenantId: string;
  saleId: string;
  customerId: string | null;
  balanceDue: number;
  paidTotal: number;
  note?: string | null;
}) {
  const { supabase } = await requireUserContext();
  const { data: existing, error: existingError } = await supabase
    .from("customer_debts")
    .select("id, original_amount")
    .eq("sale_id", saleId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (balanceDue <= 0) {
    if (existing) {
      const { error } = await supabase
        .from("customer_debts")
        .update({ paid_amount: existing.original_amount, balance: 0, status: "paid" })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    }
    return;
  }

  if (!customerId) throw new Error("Cliente requerido para deuda");
  const originalAmount = roundMoney(paidTotal + balanceDue);
  const payload = {
    tenant_id: tenantId,
    customer_id: customerId,
    sale_id: saleId,
    original_amount: originalAmount,
    paid_amount: paidTotal,
    balance: balanceDue,
    status: "open",
    notes: note || null,
  };

  const request = existing
    ? supabase.from("customer_debts").update(payload).eq("id", existing.id)
    : supabase.from("customer_debts").insert(payload);
  const { error } = await request;
  if (error) throw new Error(error.message);
}

async function applyInventoryDiff(oldItems: SaleItem[], nextItems: { input: { quantity: number }; product: Product }[], saleNumber: string) {
  const { supabase } = await requireUserContext();
  const oldByProduct = new Map<string, number>();
  oldItems.forEach((item) => oldByProduct.set(item.product_id, (oldByProduct.get(item.product_id) ?? 0) + item.quantity));
  const nextByProduct = new Map<string, { quantity: number; stock: number; name: string }>();
  nextItems.forEach((item) => {
    const current = nextByProduct.get(item.product.id);
    nextByProduct.set(item.product.id, {
      quantity: (current?.quantity ?? 0) + item.input.quantity,
      stock: item.product.current_stock,
      name: item.product.name,
    });
  });

  for (const [productId, next] of nextByProduct) {
    const previous = oldByProduct.get(productId) ?? 0;
    const delta = next.quantity - previous;
    if (delta > 0 && delta > next.stock) throw new Error(`${next.name}: stock insuficiente para editar`);
  }

  const productIds = new Set([...oldByProduct.keys(), ...nextByProduct.keys()]);
  for (const productId of productIds) {
    const previous = oldByProduct.get(productId) ?? 0;
    const next = nextByProduct.get(productId)?.quantity ?? 0;
    const delta = next - previous;
    if (delta === 0) continue;
    const { error } = await supabase.rpc("record_inventory_movement", {
      p_product_id: productId,
      p_type: delta > 0 ? "exit" : "entry",
      p_quantity: Math.abs(delta),
      p_comment: `Edicion venta ${saleNumber}`,
    });
    if (error) throw new Error(error.message);
  }
}

export async function getSaleByNumber(saleNumber: string) {
  const { supabase } = await requireUserContext();
  const clean = saleNumber.trim();
  if (!clean) throw new Error("Folio requerido");

  const { data, error } = await supabase
    .from("sales")
    .select(`
      *,
      customers(id, name, phone, email),
      items:sale_items(*, products(id, name, internal_code, current_stock)),
      payments:sale_payments(*),
      refunds:sale_refunds(*, items:sale_refund_items(*))
    `)
    .eq("sale_number", clean)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Venta no encontrada");

  const { data: events, error: eventsError } = await supabase
    .from("sale_events")
    .select("*, users(full_name, email)")
    .eq("sale_id", data.id)
    .order("created_at", { ascending: false });
  if (eventsError) throw new Error(eventsError.message);
  const { data: debt, error: debtError } = await supabase
    .from("customer_debts")
    .select("*")
    .eq("sale_id", data.id)
    .maybeSingle();
  if (debtError) throw new Error(debtError.message);

  return { ...data, debt: debt ?? null, events: events ?? [] } as Sale;
}

export async function refundSale(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = refundSaleSchema.parse(input);
  const sale = await getSaleById(values.sale_id);
  if (sale.status === "refunded" || sale.status === "canceled") throw new Error("Venta cerrada para reembolso");

  const paymentMethod = await getPaymentMethod(values.payment_method_id);
  const selected = values.items.filter((item) => item.quantity > 0);
  if (selected.length === 0) throw new Error("Selecciona al menos una pieza");

  const items = new Map((sale.items ?? []).map((item) => [item.id, item]));
  const refundItems = selected.map((entry) => {
    const item = items.get(entry.sale_item_id);
    if (!item) throw new Error("Articulo invalido");
    const available = item.quantity - item.refunded_quantity;
    if (entry.quantity > available) throw new Error(`${item.product_name}: excede piezas disponibles para devolver`);
    const amount = roundMoney((item.line_total / item.quantity) * entry.quantity);
    return { item, quantity: entry.quantity, amount };
  });
  const computedAmount = roundMoney(refundItems.reduce((total, item) => total + item.amount, 0));
  const refundAmount = values.amount > 0 ? values.amount : computedAmount;
  if (refundAmount > computedAmount) throw new Error("Monto de reembolso excede piezas seleccionadas");

  const { data: refund, error: refundError } = await supabase
    .from("sale_refunds")
    .insert({
      tenant_id: profile.tenant_id,
      sale_id: sale.id,
      user_id: profile.id,
      payment_method_id: paymentMethod.id,
      payment_method_name: paymentMethod.name,
      amount: refundAmount,
      affect_inventory: values.affect_inventory,
      comments: values.comments || null,
    })
    .select("id")
    .single();
  if (refundError) throw new Error(refundError.message);

  const payload = refundItems.map((entry) => ({
    tenant_id: profile.tenant_id,
    refund_id: refund.id,
    sale_item_id: entry.item.id,
    product_id: entry.item.product_id,
    quantity: entry.quantity,
    amount: entry.amount,
  }));
  const { error: itemsError } = await supabase.from("sale_refund_items").insert(payload);
  if (itemsError) throw new Error(itemsError.message);

  for (const entry of refundItems) {
    const nextQuantity = entry.item.refunded_quantity + entry.quantity;
    const { error } = await supabase
      .from("sale_items")
      .update({ refunded_quantity: nextQuantity })
      .eq("id", entry.item.id);
    if (error) throw new Error(error.message);

    if (values.affect_inventory) {
      const { error: movementError } = await supabase.rpc("record_inventory_movement", {
        p_product_id: entry.item.product_id,
        p_type: "entry",
        p_quantity: entry.quantity,
        p_comment: `Reembolso venta ${sale.sale_number}`,
      });
      if (movementError) throw new Error(movementError.message);
    }
  }

  const nextStatus = getNextRefundStatus(sale.items ?? [], refundItems);
  const { error: saleError } = await supabase
    .from("sales")
    .update({ status: nextStatus })
    .eq("id", sale.id);
  if (saleError) throw new Error(saleError.message);
  await createSaleEvent({
    tenantId: profile.tenant_id,
    userId: profile.id,
    saleId: sale.id,
    type: "refunded",
    note: values.comments,
    metadata: { amount: refundAmount, items: payload },
  });

  revalidateSalesPaths();
}

async function getPaymentMethod(id: string) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("catalog_items")
    .select("id, name, kind")
    .eq("id", id)
    .eq("kind", "payment_method")
    .single();
  if (error) throw new Error("Metodo de pago invalido");
  return data as CatalogItem;
}

async function getSaleById(id: string) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("sales")
    .select("*, items:sale_items(*)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as Sale;
}

async function createSaleEvent({
  tenantId,
  userId,
  saleId,
  type,
  note,
  metadata,
}: {
  tenantId: string;
  userId: string;
  saleId: string;
  type: "created" | "updated" | "canceled" | "refunded";
  note?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { supabase } = await requireUserContext();
  const { error } = await supabase.from("sale_events").insert({
    tenant_id: tenantId,
    user_id: userId,
    sale_id: saleId,
    type,
    note: note?.trim() || null,
    metadata: metadata ?? {},
  });
  if (error) throw new Error(error.message);
}

function getNextRefundStatus(items: SaleItem[], currentRefund: { item: SaleItem; quantity: number }[]): SaleStatus {
  const increments = new Map(currentRefund.map((entry) => [entry.item.id, entry.quantity]));
  const allRefunded = items.every((item) => item.refunded_quantity + (increments.get(item.id) ?? 0) >= item.quantity);
  return allRefunded ? "refunded" : "partially_refunded";
}

async function insertSaleWithNextNumber(payload: {
  tenantId: string;
  userId: string;
  customerId: string | null;
  comments: string | null;
  subtotal: number;
  discountType: "amount" | "percent" | null;
  discountValue: number;
  discountTotal: number;
  total: number;
  paidTotal: number;
  balanceDue: number;
  status: "completed" | "with_debt";
}) {
  const { supabase } = await requireUserContext();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const saleNumber = await nextSaleNumber(payload.tenantId);
    const { data, error } = await supabase
      .from("sales")
      .insert({
        tenant_id: payload.tenantId,
        user_id: payload.userId,
        customer_id: payload.customerId,
        sale_number: saleNumber,
        comments: payload.comments,
        subtotal: payload.subtotal,
        discount_type: payload.discountType,
        discount_value: payload.discountValue,
        discount_total: payload.discountTotal,
        total: payload.total,
        paid_total: payload.paidTotal,
        balance_due: payload.balanceDue,
        status: payload.status,
      })
      .select("id, sale_number")
      .single();
    if (!error) return data;
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("No se pudo generar folio unico");
}

async function nextSaleNumber(tenantId: string) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("sales")
    .select("sale_number")
    .eq("tenant_id", tenantId)
    .like("sale_number", "S-%")
    .order("sale_number", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);

  const current = data?.[0]?.sale_number?.match(/^S-(\d+)$/)?.[1];
  const next = current ? Number(current) + 1 : 1;
  return `S-${String(next).padStart(6, "0")}`;
}

function revalidateSalesPaths() {
  revalidatePath("/sales");
  revalidatePath("/debtors");
  revalidatePath("/products");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
}
