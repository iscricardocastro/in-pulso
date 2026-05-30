"use server";

import { revalidatePath } from "next/cache";
import {
  purchaseOrderCancelSchema,
  purchaseOrderPaymentSchema,
  purchaseOrderSchema,
  purchaseOrderTransitSchema,
  receiveOrderSchema,
} from "@/features/purchase-orders/schemas";
import { requireUserContext } from "@/services/context";
import type { Json, PurchaseOrder, PurchaseOrderEventType, PurchaseOrderStatus } from "@/types/database";

export async function getPurchaseOrders() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, suppliers(id, name, average_delivery_days), events:purchase_order_events(*, users(full_name, email))")
    .order("expected_arrival", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((order) => ({
    ...order,
    events: [...(order.events ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
  })) as PurchaseOrder[];
}

export async function createPurchaseOrder(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = purchaseOrderSchema.parse(input);
  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("id", values.supplier_id)
    .single();
  if (supplierError) throw new Error(supplierError.message);

  const estimatedTotal = values.expected_items.reduce(
    (total, item) => total + item.quantity_requested * item.unit_cost,
    0,
  );

  const created = await insertPurchaseOrderWithNextNumber({
    supabase,
    tenantId: profile.tenant_id,
    payload: {
      supplier_id: values.supplier_id,
      supplier: supplier.name,
      status: values.status,
      expected_arrival: values.expected_arrival,
      advance_percent: values.advance_percent,
      advance_paid: values.advance_paid,
      estimated_total: estimatedTotal,
      expected_items: values.expected_items.map((item) => ({ ...item, received_quantity: 0 })),
      received_items: [],
      notes: values.notes || null,
    },
  });
  await createPurchaseOrderEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    orderId: created.id,
    type: "created",
    toStatus: created.status as PurchaseOrderStatus,
    note: values.notes,
  });
  revalidatePath("/purchase-orders");
  revalidatePath("/dashboard");
}

async function insertPurchaseOrderWithNextNumber({
  supabase,
  tenantId,
  payload,
}: {
  supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"];
  tenantId: string;
  payload: Record<string, unknown>;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const orderNumber = await nextPurchaseOrderNumber(supabase, tenantId);
    const { data, error } = await supabase
      .from("purchase_orders")
      .insert({
        tenant_id: tenantId,
        order_number: orderNumber,
        ...payload,
      })
      .select("id, status")
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw new Error(error.message);
  }

  throw new Error("No se pudo generar numero de pedido unico");
}

async function nextPurchaseOrderNumber(
  supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"],
  tenantId: string,
) {
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("order_number")
    .eq("tenant_id", tenantId)
    .like("order_number", "PO-%")
    .order("order_number", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const current = data?.[0]?.order_number?.match(/^PO-(\d+)$/)?.[1];
  const next = current ? Number(current) + 1 : 1;
  return `PO-${String(next).padStart(6, "0")}`;
}

export async function recordPurchaseOrderPayment(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = purchaseOrderPaymentSchema.parse(input);

  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("id, tenant_id, status, advance_paid, estimated_total")
    .eq("id", values.order_id)
    .single();
  if (orderError) throw new Error(orderError.message);
  if (["received", "canceled"].includes(order.status)) throw new Error("Pedido ya cerrado");

  const { data: paymentMethod, error: methodError } = await supabase
    .from("catalog_items")
    .select("id, name, kind")
    .eq("id", values.payment_method_id)
    .eq("kind", "payment_method")
    .single();
  if (methodError) throw new Error("Metodo de pago invalido");

  const currentPaid = Number(order.advance_paid ?? 0);
  const total = Number(order.estimated_total ?? 0);
  const pending = Math.max(0, total - currentPaid);
  if (pending <= 0) throw new Error("Pedido ya esta pagado");
  if (values.amount > pending) throw new Error(`Monto excede saldo pendiente (${pending})`);

  const nextPaid = currentPaid + values.amount;
  const nextStatus: PurchaseOrderStatus = nextPaid >= total ? "paid" : "partially_paid";
  const fromStatus = order.status as PurchaseOrderStatus;

  const { error } = await supabase
    .from("purchase_orders")
    .update({ advance_paid: nextPaid, status: nextStatus })
    .eq("id", values.order_id);
  if (error) throw new Error(error.message);

  await createPurchaseOrderEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    orderId: values.order_id,
    type: "payment_recorded",
    fromStatus,
    toStatus: nextStatus,
    amount: values.amount,
    paymentMethodId: paymentMethod.id,
    paymentMethodName: paymentMethod.name,
    note: values.note,
    metadata: { paid_before: currentPaid, paid_after: nextPaid, estimated_total: total },
  });
  revalidatePath("/purchase-orders");
  revalidatePath("/dashboard");
}

export async function cancelPurchaseOrder(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = purchaseOrderCancelSchema.parse(input);
  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("id, status, notes")
    .eq("id", values.order_id)
    .single();
  if (orderError) throw new Error(orderError.message);
  if (order.status === "canceled") throw new Error("Pedido ya cancelado");
  if (order.status === "received") throw new Error("Pedido recibido no se puede cancelar; elimina para revertir recepcion");

  const note = values.note?.trim();
  const nextNotes = note
    ? [order.notes, `Pedido cancelado (${new Date().toLocaleString("es-MX")}): ${note}`].filter(Boolean).join("\n\n")
    : order.notes;
  const fromStatus = order.status as PurchaseOrderStatus;

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "canceled", notes: nextNotes })
    .eq("id", values.order_id);
  if (error) throw new Error(error.message);

  await createPurchaseOrderEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    orderId: values.order_id,
    type: "canceled",
    fromStatus,
    toStatus: "canceled",
    note,
  });
  revalidatePath("/purchase-orders");
  revalidatePath("/dashboard");
}

export async function deletePurchaseOrder(id: string) {
  const { supabase } = await requireUserContext();
  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("id, received_items")
    .eq("id", id)
    .single();
  if (orderError) throw new Error(orderError.message);

  for (const item of (order.received_items ?? []) as { product_id: string; received_quantity?: number }[]) {
    const quantity = item.received_quantity ?? 0;
    if (quantity <= 0) continue;
    const { error } = await supabase.rpc("record_inventory_movement", {
      p_product_id: item.product_id,
      p_type: "exit",
      p_quantity: quantity,
      p_comment: `Reversa por eliminacion de pedido ${id}`,
    });
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/purchase-orders");
  revalidatePath("/products");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
}

export async function markPurchaseOrderInTransit(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = purchaseOrderTransitSchema.parse(input);

  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("id, status")
    .eq("id", values.order_id)
    .single();
  if (orderError) throw new Error(orderError.message);
  if (!["paid", "partially_paid"].includes(order.status)) throw new Error("Registra pago antes de marcar en camino");

  const fromStatus = order.status as PurchaseOrderStatus;
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status: "in_transit" })
    .eq("id", values.order_id);
  if (error) throw new Error(error.message);

  await createPurchaseOrderEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    orderId: values.order_id,
    type: "marked_in_transit",
    fromStatus,
    toStatus: "in_transit",
    note: values.note,
  });
  revalidatePath("/purchase-orders");
  revalidatePath("/dashboard");
}

export async function receivePurchaseOrder(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = receiveOrderSchema.parse(input);

  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("status, notes, received_items")
    .eq("id", values.order_id)
    .single();
  if (orderError) throw new Error(orderError.message);
  if (["received", "canceled"].includes(order.status)) throw new Error("Pedido ya cerrado");

  const previous = new Map(
    ((order.received_items ?? []) as { product_id: string; received_quantity: number }[]).map((item) => [
      item.product_id,
      item.received_quantity ?? 0,
    ]),
  );

  for (const item of values.received_items) {
    const delta = item.received_quantity - (previous.get(item.product_id) ?? 0);
    if (delta <= 0) continue;
    const { error } = await supabase.rpc("record_inventory_movement", {
      p_product_id: item.product_id,
      p_type: "entry",
      p_quantity: delta,
      p_comment: `Recepcion de pedido ${values.order_id}`,
    });
    if (error) throw new Error(error.message);
  }

  const allReceived = values.received_items.every(
    (item) => item.received_quantity >= item.quantity_requested,
  );
  const closeIncomplete = Boolean(values.close_order && !allReceived);
  const receptionNote = values.reception_note?.trim();
  const fromStatus = order.status as PurchaseOrderStatus;
  const toStatus: PurchaseOrderStatus = allReceived || closeIncomplete ? "received" : "in_transit";
  const eventType: PurchaseOrderEventType = allReceived
    ? "received_complete"
    : closeIncomplete
      ? "received_incomplete_closed"
      : "received_progress";

  if (closeIncomplete && !receptionNote) {
    throw new Error("Agrega una nota para cerrar incompleto");
  }

  const nextNotes = receptionNote
    ? [order.notes, `${closeIncomplete ? "Recepcion cerrada incompleta" : "Recepcion"} (${new Date().toLocaleString("es-MX")}): ${receptionNote}`]
        .filter(Boolean)
        .join("\n\n")
    : order.notes;

  const { error } = await supabase
    .from("purchase_orders")
    .update({
      received_items: values.received_items,
      status: toStatus,
      notes: nextNotes,
    })
    .eq("id", values.order_id);

  if (error) throw new Error(error.message);
  await createPurchaseOrderEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    orderId: values.order_id,
    type: eventType,
    fromStatus,
    toStatus,
    note: receptionNote,
    metadata: {
      received_items: values.received_items,
      all_received: allReceived,
      closed_incomplete: closeIncomplete,
    },
  });
  revalidatePath("/purchase-orders");
  revalidatePath("/products");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
}

async function createPurchaseOrderEvent({
  supabase,
  tenantId,
  userId,
  orderId,
  type,
  fromStatus,
  toStatus,
  amount,
  paymentMethodId,
  paymentMethodName,
  note,
  metadata,
}: {
  supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"];
  tenantId: string;
  userId: string;
  orderId: string;
  type: PurchaseOrderEventType;
  fromStatus?: PurchaseOrderStatus | null;
  toStatus?: PurchaseOrderStatus | null;
  amount?: number | null;
  paymentMethodId?: string | null;
  paymentMethodName?: string | null;
  note?: string | null;
  metadata?: Json;
}) {
  const { error } = await supabase.from("purchase_order_events").insert({
    tenant_id: tenantId,
    purchase_order_id: orderId,
    user_id: userId,
    type,
    from_status: fromStatus ?? null,
    to_status: toStatus ?? null,
    amount: amount ?? null,
    payment_method_id: paymentMethodId ?? null,
    payment_method_name: paymentMethodName ?? null,
    note: note?.trim() || null,
    metadata: metadata ?? {},
  });
  if (error) throw new Error(error.message);
}
