"use server";

import { revalidatePath } from "next/cache";
import {
  cancelInventoryAuditSchema,
  closeInventoryAuditSchema,
  countInventoryAuditItemSchema,
  createInventoryAuditSchema,
} from "@/features/inventory-audits/schemas";
import { productBrand, productCategory, productModel } from "@/lib/catalog-display";
import { requireUserContext } from "@/services/context";
import type { CatalogItem, InventoryAudit, InventoryAuditItem, Product } from "@/types/database";

export type InventoryAuditSummary = {
  totalItems: number;
  countedItems: number;
  expectedPieces: number;
  countedPieces: number;
  positiveDifference: number;
  negativeDifference: number;
};
export type CountInventoryAuditItemResult = {
  item: InventoryAuditItem;
  summary: InventoryAuditSummary;
};

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

export async function getOpenInventoryAudits() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("inventory_audits")
    .select("*, users(full_name, email), items:inventory_audit_items(*, products(id, name, internal_code, current_stock))")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryAudit[];
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

  const { data: overlappingAudits, error: openError } = await supabase
    .from("inventory_audits")
    .select("audit_number, category_names")
    .eq("status", "open")
    .overlaps("category_ids", values.category_ids);
  if (openError) throw new Error(openError.message);
  if ((overlappingAudits ?? []).length > 0) {
    const audit = overlappingAudits[0];
    throw new Error(`Categoria ya en conteo abierto (${audit.audit_number}: ${audit.category_names.join(", ")})`);
  }

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

  const { data, error } = await supabase.rpc("count_inventory_audit_item", {
    p_audit_id: values.audit_id,
    p_item_id: values.item_id,
    p_mode: values.mode,
    p_quantity: values.quantity,
  });
  if (error) throwSupabaseError(error, "No se pudo contar producto");

  return data as CountInventoryAuditItemResult;
}

export async function closeInventoryAudit(input: unknown) {
  const { supabase } = await requireUserContext();
  const values = closeInventoryAuditSchema.parse(input);

  const { data: auditNumber, error } = await supabase.rpc("close_inventory_audit", {
    p_audit_id: values.audit_id,
    p_apply_inventory: values.apply_inventory,
    p_uncounted_policy: values.uncounted_policy,
  });
  if (error) throwSupabaseError(error, "No se pudo cerrar conteo");

  revalidateInventoryAuditPaths();
  return auditNumber as string;
}

export async function cancelInventoryAudit(input: unknown) {
  const { supabase } = await requireUserContext();
  const values = cancelInventoryAuditSchema.parse(input);

  const { error } = await supabase
    .from("inventory_audits")
    .update({
      status: "canceled",
      closed_at: new Date().toISOString(),
    })
    .eq("id", values.audit_id)
    .eq("status", "open");
  if (error) throwSupabaseError(error, "No se pudo cancelar inventario");

  revalidateInventoryAuditPaths();
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

function throwSupabaseError(error: { code?: string; details?: string; hint?: string; message: string }, context: string): never {
  const detail = [error.message, error.details, error.hint, error.code].filter(Boolean).join(" · ");
  throw new Error(`${context}: ${detail}`);
}
