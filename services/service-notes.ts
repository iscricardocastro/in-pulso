"use server";

import { revalidatePath } from "next/cache";
import {
  cancelServiceNoteSchema,
  serviceNotePaymentSchema,
  serviceNoteSchema,
  serviceNoteStatusSchema,
  serviceTemplateSchema,
} from "@/features/service-notes/schemas";
import { roundMoney } from "@/lib/money";
import { slugKey } from "@/lib/slug";
import { requireUserContext } from "@/services/context";
import type {
  CatalogItem,
  DiscountType,
  Json,
  Product,
  ServiceNote,
  ServiceNoteEvent,
  ServiceNoteStatus,
  ServiceTemplate,
} from "@/types/database";

type Supabase = Awaited<ReturnType<typeof requireUserContext>>["supabase"];
type ServiceNoteValues = ReturnType<typeof serviceNoteSchema.parse>;

export async function getServiceTemplates() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("service_templates")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ServiceTemplate[];
}

export async function upsertServiceTemplate(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = serviceTemplateSchema.parse(input);
  const payload = {
    fields: values.fields.map((field) => ({
      key: slugKey(field.key || field.label),
      label: field.label,
    })),
    name: values.name,
    tenant_id: profile.tenant_id,
  };

  const query = values.id
    ? supabase.from("service_templates").update(payload).eq("id", values.id).select("*").single()
    : supabase.from("service_templates").insert(payload).select("*").single();

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/service-notes");
  return data as ServiceTemplate;
}

export async function getServiceNotes(limit = 100) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("service_notes")
    .select("*, customers(id, name, phone, email), template:service_templates(id, name, fields), items:service_note_items(*, products(id, name, internal_code, current_stock)), payments:service_note_payments(*), events:service_note_events(*, users(full_name, email))")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map(sortServiceNoteRelations) as ServiceNote[];
}

export async function getServiceNoteByNumber(noteNumber: string) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("service_notes")
    .select("*, customers(id, name, phone, email), template:service_templates(id, name, fields), items:service_note_items(*, products(id, name, internal_code, current_stock)), payments:service_note_payments(*), events:service_note_events(*, users(full_name, email))")
    .eq("note_number", noteNumber)
    .single();

  if (error) throw new Error(error.message);
  return sortServiceNoteRelations(data) as ServiceNote;
}

export async function searchServiceProducts(query: string) {
  const { supabase } = await requireUserContext();
  const term = query.trim();
  if (term.length < 2) return [];

  const { data, error } = await supabase
    .from("products")
    .select("id, name, internal_code, current_stock, sale_price, suggested_price")
    .or(`name.ilike.%${term}%,internal_code.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`)
    .gt("current_stock", 0)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Product, "id" | "name" | "internal_code" | "current_stock" | "sale_price" | "suggested_price">[];
}

export async function createServiceNote(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = serviceNoteSchema.parse(input);
  const totals = calculateServiceTotals(values);
  const payments = await normalizePayments(supabase, values.payments, totals.total);
  const paidTotal = payments.reduce((sum, payment) => sum + payment.amount_paid, 0);
  const note = await insertServiceNoteWithNextNumber({
    supabase,
    tenantId: profile.tenant_id,
    payload: {
      balance_due: Math.max(0, totals.total - paidTotal),
      customer_id: values.customer_id,
      device_fields: values.device_fields,
      discount_total: totals.discount_total,
      discount_type: values.discount_type || null,
      discount_value: values.discount_value,
      notes: values.notes || null,
      paid_total: paidTotal,
      status: "received",
      subtotal: totals.subtotal,
      template_id: values.template_id,
      total: totals.total,
      user_id: profile.id,
    },
  });

  await insertServiceNoteItems(supabase, profile.tenant_id, note.id, values.items);
  await insertServiceNotePayments(supabase, profile.tenant_id, note.id, payments);
  await createServiceNoteEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    serviceNoteId: note.id,
    type: "created",
    toStatus: "received",
    metadata: { paid_total: paidTotal, total: totals.total },
  });

  revalidateServiceNotePaths();
  return note.note_number as string;
}

export async function updateServiceNote(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = serviceNoteSchema.extend({ id: serviceNoteSchema.shape.id.unwrap() }).parse(input);
  const current = await getServiceNoteById(supabase, values.id);
  if (current.status === "delivered" || current.status === "canceled") throw new Error("Nota cerrada no se puede editar");

  const totals = calculateServiceTotals(values);
  const paidTotal = Number(current.paid_total ?? 0);
  const { error } = await supabase
    .from("service_notes")
    .update({
      balance_due: Math.max(0, totals.total - paidTotal),
      customer_id: values.customer_id,
      device_fields: values.device_fields,
      discount_total: totals.discount_total,
      discount_type: values.discount_type || null,
      discount_value: values.discount_value,
      notes: values.notes || null,
      subtotal: totals.subtotal,
      template_id: values.template_id,
      total: totals.total,
    })
    .eq("id", values.id);
  if (error) throw new Error(error.message);

  const { error: deleteItemsError } = await supabase.from("service_note_items").delete().eq("service_note_id", values.id);
  if (deleteItemsError) throw new Error(deleteItemsError.message);
  await insertServiceNoteItems(supabase, profile.tenant_id, values.id, values.items);
  await createServiceNoteEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    serviceNoteId: values.id,
    type: "updated",
    note: values.notes,
    metadata: { total: totals.total },
  });

  revalidateServiceNotePaths();
}

export async function recordServiceNotePayment(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = serviceNotePaymentSchema.parse(input);
  const note = await getServiceNoteById(supabase, values.service_note_id);
  if (note.status === "canceled") throw new Error("Nota cancelada");
  if (note.status === "delivered" && Number(note.balance_due) <= 0) throw new Error("Nota ya cerrada sin saldo");

  const [payment] = await normalizePayments(supabase, [values], Number(note.total ?? 0), Number(note.paid_total ?? 0));
  const nextPaid = Number(note.paid_total ?? 0) + payment.amount_paid;
  const nextBalance = Math.max(0, Number(note.total ?? 0) - nextPaid);

  await insertServiceNotePayments(supabase, profile.tenant_id, note.id, [payment]);
  const { error } = await supabase
    .from("service_notes")
    .update({ paid_total: nextPaid, balance_due: nextBalance })
    .eq("id", note.id);
  if (error) throw new Error(error.message);

  await createServiceNoteEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    serviceNoteId: note.id,
    type: "payment_recorded",
    amount: payment.amount_paid,
    paymentMethodId: payment.payment_method_id,
    paymentMethodName: payment.payment_method_name,
    note: payment.comments,
    metadata: { paid_before: note.paid_total, paid_after: nextPaid, balance_due: nextBalance },
  });

  revalidateServiceNotePaths();
}

export async function changeServiceNoteStatus(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = serviceNoteStatusSchema.parse(input);
  const note = await getServiceNoteById(supabase, values.service_note_id);
  if (note.status === "canceled") throw new Error("Nota cancelada");
  if (note.status === "delivered") throw new Error("Nota ya entregada");

  if (values.status === "delivered") {
    await applyServiceNoteInventory(supabase, note);
  }

  const updatePayload: Record<string, unknown> = { status: values.status };
  if (values.status === "delivered") {
    updatePayload.delivered_at = new Date().toISOString();
    updatePayload.inventory_applied = true;
  }

  const { error } = await supabase.from("service_notes").update(updatePayload).eq("id", note.id);
  if (error) throw new Error(error.message);

  await createServiceNoteEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    serviceNoteId: note.id,
    type: values.status === "delivered" ? "delivered" : "status_changed",
    fromStatus: note.status,
    toStatus: values.status,
    note: values.note,
  });

  revalidateServiceNotePaths();
}

export async function cancelServiceNote(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = cancelServiceNoteSchema.parse(input);
  const note = await getServiceNoteById(supabase, values.service_note_id);
  if (note.status === "canceled") throw new Error("Nota ya cancelada");
  if (note.inventory_applied) throw new Error("Nota con inventario aplicado no se puede cancelar en v1");

  const { error } = await supabase
    .from("service_notes")
    .update({ canceled_at: new Date().toISOString(), status: "canceled" })
    .eq("id", note.id);
  if (error) throw new Error(error.message);

  await createServiceNoteEvent({
    supabase,
    tenantId: profile.tenant_id,
    userId: profile.id,
    serviceNoteId: note.id,
    type: "canceled",
    fromStatus: note.status,
    toStatus: "canceled",
    note: values.note,
  });

  revalidateServiceNotePaths();
}

async function insertServiceNoteWithNextNumber({
  supabase,
  tenantId,
  payload,
}: {
  supabase: Supabase;
  tenantId: string;
  payload: Record<string, unknown>;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const noteNumber = await nextServiceNoteNumber(supabase, tenantId);
    const { data, error } = await supabase
      .from("service_notes")
      .insert({ tenant_id: tenantId, note_number: noteNumber, ...payload })
      .select("id, note_number")
      .single();

    if (!error) return data;
    if (error.code !== "23505") throw new Error(error.message);
  }

  throw new Error("No se pudo generar numero de nota unico");
}

async function nextServiceNoteNumber(supabase: Supabase, tenantId: string) {
  const { data, error } = await supabase
    .from("service_notes")
    .select("note_number")
    .eq("tenant_id", tenantId)
    .like("note_number", "N-%")
    .order("note_number", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const current = data?.[0]?.note_number?.match(/^N-(\d+)$/)?.[1];
  const next = current ? Number(current) + 1 : 1;
  return `N-${String(next).padStart(6, "0")}`;
}

async function getServiceNoteById(supabase: Supabase, id: string) {
  const { data, error } = await supabase
    .from("service_notes")
    .select("*, items:service_note_items(*, products(id, name, internal_code, current_stock))")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as ServiceNote;
}

async function insertServiceNoteItems(
  supabase: Supabase,
  tenantId: string,
  serviceNoteId: string,
  items: ServiceNoteValues["items"],
) {
  const rows = items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = roundMoney(Number(item.unit_price));
    return {
      description: item.description,
      item_type: item.product_id ? "part" : item.item_type,
      line_total: roundMoney(quantity * unitPrice),
      product_code: item.product_code || null,
      product_id: item.product_id || null,
      quantity,
      service_note_id: serviceNoteId,
      tenant_id: tenantId,
      unit_price: unitPrice,
    };
  });
  const { error } = await supabase.from("service_note_items").insert(rows);
  if (error) throw new Error(error.message);
}

async function insertServiceNotePayments(
  supabase: Supabase,
  tenantId: string,
  serviceNoteId: string,
  payments: NormalizedPayment[],
) {
  if (payments.length === 0) return;
  const { error } = await supabase.from("service_note_payments").insert(
    payments.map((payment) => ({
      amount_paid: payment.amount_paid,
      amount_received: payment.amount_received,
      change_due: payment.change_due,
      comments: payment.comments || null,
      payment_method_id: payment.payment_method_id,
      payment_method_name: payment.payment_method_name,
      service_note_id: serviceNoteId,
      tenant_id: tenantId,
    })),
  );
  if (error) throw new Error(error.message);
}

async function normalizePayments(
  supabase: Supabase,
  payments: { amount_received: number; comments?: string; payment_method_id: string }[],
  total: number,
  alreadyPaid = 0,
) {
  const positivePayments = payments.filter((payment) => Number(payment.amount_received) > 0);
  const methodIds = Array.from(new Set(positivePayments.map((payment) => payment.payment_method_id)));
  if (methodIds.length === 0) return [];

  const { data, error } = await supabase
    .from("catalog_items")
    .select("id, name, kind")
    .eq("kind", "payment_method")
    .in("id", methodIds);
  if (error) throw new Error(error.message);

  const methods = new Map((data ?? []).map((method) => [method.id, method as CatalogItem]));
  let remaining = roundMoney(Math.max(0, total - alreadyPaid));
  return positivePayments.map((payment) => {
    const method = methods.get(payment.payment_method_id);
    if (!method) throw new Error("Metodo de pago invalido");
    const received = roundMoney(Number(payment.amount_received));
    const paid = roundMoney(Math.min(received, remaining));
    remaining = roundMoney(Math.max(0, remaining - paid));
    return {
      amount_paid: paid,
      amount_received: received,
      change_due: remaining === 0 ? roundMoney(Math.max(0, received - paid)) : 0,
      comments: payment.comments || null,
      payment_method_id: method.id,
      payment_method_name: method.name,
    };
  });
}

type NormalizedPayment = Awaited<ReturnType<typeof normalizePayments>>[number];

async function applyServiceNoteInventory(supabase: Supabase, note: ServiceNote) {
  if (note.inventory_applied) return;
  const parts = (note.items ?? []).filter((item) => item.product_id && item.item_type === "part");
  for (const item of parts) {
    const { error } = await supabase.rpc("record_inventory_movement", {
      p_comment: `Nota ${note.note_number}`,
      p_product_id: item.product_id,
      p_quantity: item.quantity,
      p_type: "exit",
    });
    if (error) throw new Error(error.message);
  }
}

async function createServiceNoteEvent({
  supabase,
  tenantId,
  userId,
  serviceNoteId,
  type,
  fromStatus,
  toStatus,
  amount,
  paymentMethodId,
  paymentMethodName,
  note,
  metadata = {},
}: {
  supabase: Supabase;
  tenantId: string;
  userId: string;
  serviceNoteId: string;
  type: ServiceNoteEvent["type"];
  fromStatus?: ServiceNoteStatus | null;
  toStatus?: ServiceNoteStatus | null;
  amount?: number;
  paymentMethodId?: string;
  paymentMethodName?: string;
  note?: string | null;
  metadata?: Json;
}) {
  const { error } = await supabase.from("service_note_events").insert({
    amount: amount ?? null,
    from_status: fromStatus ?? null,
    metadata,
    note: note || null,
    payment_method_id: paymentMethodId ?? null,
    payment_method_name: paymentMethodName ?? null,
    service_note_id: serviceNoteId,
    tenant_id: tenantId,
    to_status: toStatus ?? null,
    type,
    user_id: userId,
  });
  if (error) throw new Error(error.message);
}

function calculateServiceTotals(values: Pick<ServiceNoteValues, "discount_type" | "discount_value" | "items">) {
  const subtotal = roundMoney(values.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0));
  const discountTotal = discountAmount(subtotal, values.discount_type || null, Number(values.discount_value ?? 0));
  return {
    discount_total: discountTotal,
    subtotal,
    total: roundMoney(Math.max(0, subtotal - discountTotal)),
  };
}

function discountAmount(subtotal: number, type: DiscountType | null, value: number) {
  if (!type || value <= 0) return 0;
  if (type === "percent") return roundMoney(subtotal * Math.min(value, 100) / 100);
  return roundMoney(Math.min(value, subtotal));
}

function sortServiceNoteRelations(note: ServiceNote) {
  return {
    ...note,
    events: [...(note.events ?? [])].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    items: [...(note.items ?? [])].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
    payments: [...(note.payments ?? [])].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
  };
}

function revalidateServiceNotePaths() {
  revalidatePath("/service-notes");
  revalidatePath("/products");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
}
