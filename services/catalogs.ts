"use server";

import { revalidatePath } from "next/cache";
import { catalogItemSchema, catalogKinds } from "@/features/catalogs/schemas";
import { requireUserContext } from "@/services/context";
import type { CatalogItem, CatalogKind } from "@/types/database";

export async function getCatalogItems() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .order("kind", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CatalogItem[];
}

export async function upsertCatalogItem(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = catalogItemSchema.parse(input);
  const parentId = values.kind === "model" ? values.parent_id : null;
  if (values.kind === "model" && !parentId) throw new Error("Selecciona marca para el modelo");

  const payload = {
    tenant_id: profile.tenant_id,
    parent_id: parentId,
    kind: values.kind,
    name: values.name,
  };

  if (values.id) {
    const { error } = await supabase.from("catalog_items").update(payload).eq("id", values.id);
    if (error) throw new Error(error.message);
  } else {
    await getOrCreateCatalogItem(supabase, profile.tenant_id, values.kind, values.name, parentId);
  }

  revalidateCatalogPaths();
}

export async function createCatalogItem(kind: CatalogKind, name: string, parentId?: string | null) {
  const { supabase, profile } = await requireUserContext();
  if (!catalogKinds.includes(kind)) throw new Error("Catalogo invalido");
  if (kind === "model" && !parentId) throw new Error("Selecciona marca antes de agregar modelo");
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Nombre requerido");

  const data = await getOrCreateCatalogItem(supabase, profile.tenant_id, kind, cleanName, kind === "model" ? parentId : null);
  revalidateCatalogPaths();
  return data as CatalogItem;
}

export async function deleteCatalogItem(id: string) {
  const { supabase } = await requireUserContext();
  const { count, error: usageError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .or(`brand_id.eq.${id},model_id.eq.${id},category_id.eq.${id},variant_id.eq.${id}`);

  if (usageError) throw new Error(usageError.message);
  if ((count ?? 0) > 0) throw new Error("No se puede eliminar: catalogo usado por productos");

  const { count: eventCount, error: eventUsageError } = await supabase
    .from("purchase_order_events")
    .select("id", { count: "exact", head: true })
    .eq("payment_method_id", id);

  if (eventUsageError) throw new Error(eventUsageError.message);
  if ((eventCount ?? 0) > 0) throw new Error("No se puede eliminar: metodo usado por pagos");

  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateCatalogPaths();
}

function revalidateCatalogPaths() {
  revalidatePath("/catalogs");
  revalidatePath("/import");
  revalidatePath("/products");
  revalidatePath("/purchase-orders");
}

export async function getOrCreateCatalogItem(
  supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"],
  tenantId: string,
  kind: CatalogKind,
  name: string | undefined,
  parentId: string | null = null,
) {
  const cleanName = name?.trim();
  if (!cleanName) return null;

  let query = supabase
    .from("catalog_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("kind", kind)
    .eq("name", cleanName);

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as CatalogItem;

  const { data, error } = await supabase
    .from("catalog_items")
    .insert({
      tenant_id: tenantId,
      parent_id: parentId,
      kind,
      name: cleanName,
    })
    .select("*")
    .single();

  if (error?.code === "23505") {
    let retryQuery = supabase
      .from("catalog_items")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("kind", kind)
      .eq("name", cleanName);
    retryQuery = parentId ? retryQuery.eq("parent_id", parentId) : retryQuery.is("parent_id", null);
    const { data: retry, error: retryError } = await retryQuery.single();
    if (retryError) throw new Error(retryError.message);
    return retry as CatalogItem;
  }

  if (error) throw new Error(error.message);
  return data as CatalogItem;
}
