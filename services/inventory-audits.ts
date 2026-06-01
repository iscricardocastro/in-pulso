"use server";

import { revalidatePath } from "next/cache";
import {
  closeInventoryAuditSchema,
  countInventoryAuditItemSchema,
  createInventoryAuditSchema,
} from "@/features/inventory-audits/schemas";
import { productBrand, productCategory, productModel } from "@/lib/catalog-display";
import { requireUserContext } from "@/services/context";
import type { CatalogItem, InventoryAudit, InventoryAuditItem, Product } from "@/types/database";

export async function getInventoryAudits(limit = 50) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("inventory_audits")
    .select("*, users(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryAudit[];
}

export async function getOpenInventoryAudit() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("inventory_audits")
    .select("*, users(full_name, email), items:inventory_audit_items(*, products(id, name, internal_code, current_stock))")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as InventoryAudit | null;
}

export async function getInventoryAuditByNumber(auditNumber: string) {
  const { supabase } = await requireUserContext();
  const clean = auditNumber.trim();
  if (!clean) throw new Error("Folio requerido");

  const { data, error } = await supabase
    .from("inventory_audits")
    .select("*, users(full_name, email), items:inventory_audit_items(*, products(id, name, internal_code, current_stock))")
    .eq("audit_number", clean)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Conteo no encontrado");
  return data as InventoryAudit;
}

export async function createInventoryAudit(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = createInventoryAuditSchema.parse(input);

  const { count: openCount, error: openError } = await supabase
    .from("inventory_audits")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (openError) throw new Error(openError.message);
  if ((openCount ?? 0) > 0) throw new Error("Ya hay un conteo abierto");

  const { data: categories, error: categoriesError } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("kind", "category")
    .in("id", values.category_ids);
  if (categoriesError) throw new Error(categoriesError.message);
  if ((categories ?? []).length !== values.category_ids.length) throw new Error("Categoria invalida");

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(`
      *,
      brand_item:catalog_items!products_brand_id_fkey(id, name, parent_id),
      model_item:catalog_items!products_model_id_fkey(id, name, parent_id),
      category_item:catalog_items!products_category_id_fkey(id, name, parent_id),
      variant_item:catalog_items!products_variant_id_fkey(id, name, parent_id)
    `)
    .in("category_id", values.category_ids)
    .order("name", { ascending: true });
  if (productsError) throw new Error(productsError.message);
  if ((products ?? []).length === 0) throw new Error("Categorias sin productos");

  const { data: auditNumber, error: numberError } = await supabase.rpc("next_inventory_audit_number", {
    p_tenant_id: profile.tenant_id,
  });
  if (numberError) throw new Error(numberError.message);

  const categoryNames = sortCategories(categories as CatalogItem[]).map((category) => category.name);
  const { data: audit, error: auditError } = await supabase
    .from("inventory_audits")
    .insert({
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      audit_number: auditNumber,
      category_ids: values.category_ids,
      category_names: categoryNames,
      notes: values.notes || null,
      total_items: products?.length ?? 0,
      expected_pieces: (products ?? []).reduce((total, product) => total + Number(product.current_stock ?? 0), 0),
    })
    .select("*")
    .single();
  if (auditError) throw new Error(auditError.message);

  const rows = (products as Product[]).map((product) => ({
    tenant_id: profile.tenant_id,
    audit_id: audit.id,
    product_id: product.id,
    product_code: product.internal_code,
    product_name: product.name,
    brand: productBrand(product) || null,
    model: productModel(product) || null,
    category: productCategory(product) || null,
    initial_stock: product.current_stock,
  }));
  const { error: itemsError } = await supabase.from("inventory_audit_items").insert(rows);
  if (itemsError) throw new Error(itemsError.message);

  revalidateInventoryAuditPaths();
  return audit.audit_number as string;
}

export async function countInventoryAuditItem(input: unknown) {
  const { supabase } = await requireUserContext();
  const values = countInventoryAuditItemSchema.parse(input);
  const audit = await requireOpenAudit(values.audit_id);
  const item = audit.items?.find((entry) => entry.id === values.item_id);
  if (!item) throw new Error("Producto fuera del conteo");

  const previous = item.counted_quantity ?? 0;
  const countedQuantity = values.mode === "add" ? previous + values.quantity : values.quantity;
  const difference = countedQuantity - item.initial_stock;

  const { error } = await supabase
    .from("inventory_audit_items")
    .update({
      counted: true,
      counted_quantity: countedQuantity,
      difference,
    })
    .eq("id", values.item_id)
    .eq("audit_id", values.audit_id);
  if (error) throw new Error(error.message);

  await refreshAuditSummary(values.audit_id);
  revalidateInventoryAuditPaths();
}

export async function closeInventoryAudit(input: unknown) {
  const { supabase } = await requireUserContext();
  const values = closeInventoryAuditSchema.parse(input);
  const audit = await requireOpenAudit(values.audit_id);
  const items = audit.items ?? [];

  if (values.uncounted_policy === "zero") {
    const pending = items.filter((item) => !item.counted);
    if (pending.length > 0) {
      for (const item of pending) {
        const { error } = await supabase
          .from("inventory_audit_items")
          .update({
            counted: true,
            counted_quantity: 0,
            difference: -item.initial_stock,
          })
          .eq("id", item.id)
          .eq("audit_id", values.audit_id);
        if (error) throwSupabaseError(error, "No se pudieron marcar pendientes como 0");
      }
    }
  }

  const latestAudit = await requireOpenAudit(values.audit_id);
  const latestItems = latestAudit.items ?? [];
  const productIds = latestItems.map((item) => item.product_id);
  const currentStockByProduct = await getCurrentStockByProduct(productIds);

  for (const item of latestItems) {
    const closingStock = currentStockByProduct.get(item.product_id) ?? item.initial_stock;
    const { error } = await supabase
      .from("inventory_audit_items")
      .update({ closing_stock: closingStock })
      .eq("id", item.id);
    if (error) throwSupabaseError(error, "No se pudo guardar stock de cierre");

    if (!values.apply_inventory || !item.counted || item.counted_quantity === null) continue;
    if (item.counted_quantity === closingStock) continue;

    const { error: movementError } = await supabase.rpc("record_inventory_movement", {
      p_product_id: item.product_id,
      p_type: "adjustment",
      p_quantity: item.counted_quantity,
      p_comment: `Conteo ${latestAudit.audit_number}: ${item.product_name}, stock ${closingStock} -> ${item.counted_quantity}`,
    });
    if (movementError) throwSupabaseError(movementError, "No se pudo aplicar ajuste de inventario");
  }

  const summary = summarizeItems(latestItems);
  const { error: auditError } = await supabase
    .from("inventory_audits")
    .update({
      status: "closed",
      apply_inventory: values.apply_inventory,
      uncounted_policy: values.uncounted_policy,
      total_items: summary.totalItems,
      counted_items: summary.countedItems,
      expected_pieces: summary.expectedPieces,
      counted_pieces: summary.countedPieces,
      positive_difference: summary.positiveDifference,
      negative_difference: summary.negativeDifference,
      closed_at: new Date().toISOString(),
    })
    .eq("id", values.audit_id);
  if (auditError) throwSupabaseError(auditError, "No se pudo cerrar conteo");

  revalidateInventoryAuditPaths();
  return latestAudit.audit_number;
}

async function requireOpenAudit(auditId: string) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("inventory_audits")
    .select("*, items:inventory_audit_items(*)")
    .eq("id", auditId)
    .eq("status", "open")
    .single();
  if (error) throw new Error(error.message);
  return data as InventoryAudit;
}

async function getCurrentStockByProduct(productIds: string[]) {
  const { supabase } = await requireUserContext();
  const stockByProduct = new Map<string, number>();
  const uniqueIds = Array.from(new Set(productIds));

  for (const ids of chunk(uniqueIds, 50)) {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, current_stock")
      .in("id", ids);
    if (error) throwSupabaseError(error, "No se pudo leer stock actual");
    (products ?? []).forEach((product) => stockByProduct.set(product.id, Number(product.current_stock ?? 0)));
  }

  return stockByProduct;
}

async function refreshAuditSummary(auditId: string) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("inventory_audit_items")
    .select("*")
    .eq("audit_id", auditId);
  if (error) throw new Error(error.message);

  const summary = summarizeItems((data ?? []) as InventoryAuditItem[]);
  const { error: updateError } = await supabase
    .from("inventory_audits")
    .update({
      total_items: summary.totalItems,
      counted_items: summary.countedItems,
      expected_pieces: summary.expectedPieces,
      counted_pieces: summary.countedPieces,
      positive_difference: summary.positiveDifference,
      negative_difference: summary.negativeDifference,
    })
    .eq("id", auditId);
  if (updateError) throw new Error(updateError.message);
}

function summarizeItems(items: InventoryAuditItem[]) {
  return items.reduce(
    (summary, item) => {
      const counted = item.counted && item.counted_quantity !== null;
      const difference = counted ? (item.counted_quantity ?? 0) - item.initial_stock : 0;
      summary.totalItems += 1;
      summary.expectedPieces += item.initial_stock;
      if (counted) {
        summary.countedItems += 1;
        summary.countedPieces += item.counted_quantity ?? 0;
        if (difference > 0) summary.positiveDifference += difference;
        if (difference < 0) summary.negativeDifference += Math.abs(difference);
      }
      return summary;
    },
    {
      totalItems: 0,
      countedItems: 0,
      expectedPieces: 0,
      countedPieces: 0,
      positiveDifference: 0,
      negativeDifference: 0,
    },
  );
}

function sortCategories(categories: CatalogItem[]) {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

function revalidateInventoryAuditPaths() {
  revalidatePath("/inventory-audits");
  revalidatePath("/movements");
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function throwSupabaseError(error: { code?: string; details?: string; hint?: string; message: string }, context: string): never {
  const detail = [error.message, error.details, error.hint, error.code].filter(Boolean).join(" · ");
  throw new Error(`${context}: ${detail}`);
}
