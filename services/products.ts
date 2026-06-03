"use server";

import { revalidatePath } from "next/cache";
import { productSchema } from "@/features/products/schemas";
import { getOrCreateCatalogItem } from "@/services/catalogs";
import { requireUserContext } from "@/services/context";
import { createProductPropertyOption, getActiveProductPropertyDefinitions } from "@/services/product-properties";
import type { CatalogItem, Product, ProductPropertyDefinition } from "@/types/database";

export async function getProducts() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      suppliers(id, name, average_delivery_days),
      brand_item:catalog_items!products_brand_id_fkey(id, name, parent_id),
      model_item:catalog_items!products_model_id_fkey(id, name, parent_id),
      category_item:catalog_items!products_category_id_fkey(id, name, parent_id),
      variant_item:catalog_items!products_variant_id_fkey(id, name, parent_id)
    `)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function upsertProduct(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = productSchema.parse(input);
  const isEdit = Boolean(values.id);
  const definitions = await getActiveProductPropertyDefinitions();
  const properties = normalizeProductProperties(values.properties, definitions);
  const legacyValues = withLegacyPropertyValues(values, properties);
  const catalogValues = await resolveProductCatalogValues(supabase, profile.tenant_id, legacyValues);
  await ensurePropertyOptions(properties, definitions);

  const payload = {
    tenant_id: profile.tenant_id,
    name: values.name,
    brand_id: catalogValues.brand?.id ?? null,
    model_id: catalogValues.model?.id ?? null,
    category_id: catalogValues.category?.id ?? null,
    variant_id: catalogValues.variant?.id ?? null,
    brand: catalogValues.brand?.name ?? legacyValues.brand ?? null,
    model: catalogValues.model?.name ?? legacyValues.model ?? null,
    category: catalogValues.category?.name ?? legacyValues.category ?? null,
    variant: catalogValues.variant?.name ?? legacyValues.variant ?? null,
    cost: values.cost,
    sale_price: values.sale_price === "" ? null : values.sale_price,
    suggested_price:
      values.suggested_price === "" ? null : values.suggested_price,
    current_stock: values.current_stock,
    minimum_stock: values.minimum_stock,
    properties,
    primary_supplier_id: values.primary_supplier_id || null,
    notes: values.notes || null,
  };

  if (isEdit) {
    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", values.id);
    if (error) throw new Error(error.message);
  } else {
    const { data: code, error: codeError } = await supabase.rpc(
      "next_product_code",
      {
        p_tenant_id: profile.tenant_id,
      },
    );
    if (codeError) throw new Error(codeError.message);

    const { error } = await supabase.from("products").insert({
      ...payload,
      internal_code: code,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/products");
  revalidatePath("/catalogs");
  revalidatePath("/dashboard");
}

export async function deleteProduct(id: string) {
  const { supabase } = await requireUserContext();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

export async function importProducts(rows: unknown[]) {
  const { supabase, profile } = await requireUserContext();
  const definitions = await getActiveProductPropertyDefinitions();
  const products = [];

  for (const row of rows as Record<string, unknown>[]) {
    const parsed = productSchema.parse({
      name: row.name ?? row.Nombre,
      brand: row.brand ?? row.Marca ?? "",
      model: row.model ?? row.Modelo ?? "",
      category: row.category ?? row.Categoria ?? "",
      variant: row.variant ?? row.Variante ?? "",
      cost: row.cost ?? row.Costo ?? 0,
      sale_price:
        row.sale_price ??
        row.precio_venta ??
        row["Precio venta"] ??
        row.PrecioVenta ??
        "",
      suggested_price:
        row.suggested_price ??
        row.precio ??
        row.Precio ??
        row["Precio sugerido"] ??
        "",
      current_stock:
        row.current_stock ?? row.stock ?? row.Stock ?? row["Stock actual"] ?? 0,
      minimum_stock: row.minimum_stock ?? row["Stock minimo"] ?? 0,
      supplier: row.supplier ?? row.proveedor ?? row.Proveedor ?? "",
      properties: row.properties ?? extractPropertyValues(row, definitions),
      notes: row.notes ?? row.Notas ?? "",
    });
    products.push({
      ...parsed,
      properties: normalizeProductProperties(parsed.properties, definitions),
    });
  }

  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("internal_code")
    .eq("tenant_id", profile.tenant_id);

  if (existingError) throw new Error(existingError.message);

  const maxNumber = (existing ?? []).reduce((max, item) => {
    const value = Number(String(item.internal_code).slice(1));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const supplierNames = Array.from(
    new Set(products.map((product) => product.supplier).filter(Boolean)),
  ) as string[];
  const supplierIds = new Map<string, string>();

  if (supplierNames.length > 0) {
    const { data: existingSuppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id, name")
      .in("name", supplierNames);
    if (suppliersError) throw new Error(suppliersError.message);
    existingSuppliers?.forEach((supplier) =>
      supplierIds.set(supplier.name, supplier.id),
    );

    const missing = supplierNames.filter((name) => !supplierIds.has(name));
    if (missing.length > 0) {
      const { data: created, error: createError } = await supabase
        .from("suppliers")
        .insert(missing.map((name) => ({ tenant_id: profile.tenant_id, name })))
        .select("id, name");
      if (createError) throw new Error(createError.message);
      created?.forEach((supplier) =>
        supplierIds.set(supplier.name, supplier.id),
      );
    }
  }

  const catalogValues = await resolveManyProductCatalogValues(supabase, profile.tenant_id, products);
  for (const product of products) {
    await ensurePropertyOptions(product.properties, definitions);
  }
  const payload = products.map((product, index) => {
    const supplierName = product.supplier || "";
    const resolved = catalogValues[index];
    return {
      tenant_id: profile.tenant_id,
      internal_code: `P${String(maxNumber + index + 1).padStart(6, "0")}`,
      name: product.name,
      brand_id: resolved.brand?.id ?? null,
      model_id: resolved.model?.id ?? null,
      category_id: resolved.category?.id ?? null,
      variant_id: resolved.variant?.id ?? null,
      brand: resolved.brand?.name ?? product.brand ?? null,
      model: resolved.model?.name ?? product.model ?? null,
      category: resolved.category?.name ?? product.category ?? null,
      variant: resolved.variant?.name ?? product.variant ?? null,
      cost: product.cost,
      sale_price: product.sale_price === "" ? null : product.sale_price,
      suggested_price:
        product.suggested_price === "" ? null : product.suggested_price,
      current_stock: product.current_stock,
      minimum_stock: product.minimum_stock,
      properties: product.properties,
      primary_supplier_id: supplierIds.get(supplierName) ?? null,
      notes: product.notes || null,
    };
  });

  let insertedCount = 0;
  for (let index = 0; index < payload.length; index += 100) {
    const chunk = payload.slice(index, index + 100);
    const { data: inserted, error } = await supabase
      .from("products")
      .insert(chunk)
      .select("id, tenant_id, current_stock, internal_code");
    if (error) throw new Error(importErrorMessage(error.message));

    const initialMovements = (inserted ?? [])
      .filter((product) => product.current_stock > 0)
      .map((product) => ({
        tenant_id: profile.tenant_id,
        product_id: product.id,
        user_id: profile.id,
        type: "entry" as const,
        quantity: product.current_stock,
        comment: `Inventario inicial importado (${product.internal_code})`,
      }));

    if (initialMovements.length > 0) {
      const { error: movementError } = await supabase
        .from("inventory_movements")
        .insert(initialMovements);
      if (movementError) throw new Error(`Productos importados parcialmente; fallo historial: ${movementError.message}`);
    }

    insertedCount += inserted?.length ?? 0;
  }

  revalidatePath("/products");
  revalidatePath("/catalogs");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
  return insertedCount;
}

function normalizeProductProperties(
  input: Record<string, unknown>,
  definitions: ProductPropertyDefinition[],
) {
  const output: Record<string, string | number | boolean | null> = {};

  for (const definition of definitions) {
    const raw = input[definition.key];
    const value = normalizePropertyValue(raw, definition);
    if (definition.required && (value === null || value === "")) {
      throw new Error(`${definition.label} requerido`);
    }
    if (value !== null && value !== "") output[definition.key] = value;
  }

  return output;
}

function normalizePropertyValue(value: unknown, definition: ProductPropertyDefinition) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  if (definition.type === "number") {
    const number = Number(String(value).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(number)) throw new Error(`${definition.label} invalido`);
    return number;
  }
  if (definition.type === "boolean") {
    if (typeof value === "boolean") return value;
    const text = String(value).trim().toLowerCase();
    return ["si", "sí", "true", "1", "yes"].includes(text);
  }
  return String(value).trim();
}

function extractPropertyValues(row: Record<string, unknown>, definitions: ProductPropertyDefinition[]) {
  return Object.fromEntries(
    definitions.map((definition) => [definition.key, row[definition.key] ?? row[definition.label]]),
  );
}

function withLegacyPropertyValues<T extends ProductFormCatalogValues>(
  values: T,
  properties: Record<string, string | number | boolean | null>,
) {
  return {
    ...values,
    brand: String(properties.brand ?? values.brand ?? ""),
    model: String(properties.model ?? values.model ?? ""),
    category: String(properties.category ?? values.category ?? ""),
    variant: String(properties.variant ?? values.variant ?? ""),
  };
}

async function ensurePropertyOptions(
  properties: Record<string, string | number | boolean | null>,
  definitions: ProductPropertyDefinition[],
) {
  for (const definition of definitions) {
    if (definition.type !== "option") continue;
    const value = properties[definition.key];
    if (value === null || value === undefined || String(value).trim() === "") continue;
    await createProductPropertyOption({ definition_id: definition.id, value: String(value) });
  }
}

async function resolveManyProductCatalogValues(
  supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"],
  tenantId: string,
  products: Pick<ProductFormCatalogValues, "brand" | "model" | "category" | "variant">[],
) {
  const cache = new Map<string, CatalogItem | null>();
  const result = [];

  for (const product of products) {
    result.push(await resolveProductCatalogValues(supabase, tenantId, product, cache));
  }

  return result;
}

async function resolveProductCatalogValues(
  supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"],
  tenantId: string,
  values: ProductFormCatalogValues,
  cache?: Map<string, CatalogItem | null>,
) {
  const brand = values.brand_id
    ? await getCatalogById(supabase, tenantId, values.brand_id, "brand")
    : await getOrCreateCachedCatalogItem(supabase, tenantId, "brand", values.brand, null, cache);
  const category = values.category_id
    ? await getCatalogById(supabase, tenantId, values.category_id, "category")
    : await getOrCreateCachedCatalogItem(supabase, tenantId, "category", values.category, null, cache);
  const variant = values.variant_id
    ? await getCatalogById(supabase, tenantId, values.variant_id, "variant")
    : await getOrCreateCachedCatalogItem(supabase, tenantId, "variant", values.variant, null, cache);
  const model = values.model_id
    ? await getCatalogById(supabase, tenantId, values.model_id, "model")
    : brand
      ? await getOrCreateCachedCatalogItem(supabase, tenantId, "model", values.model, brand.id, cache)
      : null;

  if (model && brand && model.parent_id !== brand.id) throw new Error("Modelo no pertenece a la marca seleccionada");

  return { brand, model, category, variant };
}

async function getOrCreateCachedCatalogItem(
  supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"],
  tenantId: string,
  kind: "brand" | "model" | "category" | "variant",
  name: string | undefined,
  parentId: string | null,
  cache?: Map<string, CatalogItem | null>,
) {
  const cleanName = name?.trim();
  if (!cleanName) return null;
  const key = `${kind}:${parentId ?? ""}:${cleanName.toLowerCase()}`;
  if (cache?.has(key)) return cache.get(key) ?? null;
  const item = await getOrCreateCatalogItem(supabase, tenantId, kind, cleanName, parentId);
  cache?.set(key, item);
  return item;
}

async function getCatalogById(
  supabase: Awaited<ReturnType<typeof requireUserContext>>["supabase"],
  tenantId: string,
  id: string,
  kind: "brand" | "model" | "category" | "variant",
) {
  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("kind", kind)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as CatalogItem;
}

type ProductFormCatalogValues = {
  brand_id?: string;
  model_id?: string;
  category_id?: string;
  variant_id?: string;
  brand?: string;
  model?: string;
  category?: string;
  variant?: string;
};

function importErrorMessage(message: string) {
  if (message.includes("brand_id") || message.includes("model_id") || message.includes("category_id") || message.includes("variant_id")) {
    return `Falta aplicar migracion de catalogos en products: ${message}`;
  }
  return message;
}
