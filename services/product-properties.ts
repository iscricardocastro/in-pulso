"use server";

import { revalidatePath } from "next/cache";
import {
  productPropertyDefinitionSchema,
  productPropertyOptionSchema,
} from "@/features/product-properties/schemas";
import { requireUserContext } from "@/services/context";
import type {
  ProductImportTemplate,
  ProductPropertyDefinition,
  ProductPropertyOption,
} from "@/types/database";

export async function getProductPropertyDefinitions() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("product_property_definitions")
    .select("*")
    .order("display_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductPropertyDefinition[];
}

export async function getActiveProductPropertyDefinitions() {
  const definitions = await getProductPropertyDefinitions();
  return definitions.filter((definition) => definition.active);
}

export async function getProductPropertyOptions() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("product_property_options")
    .select("*")
    .eq("active", true)
    .order("value", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductPropertyOption[];
}

export async function upsertProductPropertyDefinition(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = productPropertyDefinitionSchema.parse(input);
  const payload = {
    tenant_id: profile.tenant_id,
    key: values.key,
    label: values.label,
    type: values.type,
    required: values.required,
    searchable: values.searchable,
    filterable: values.filterable,
    display_order: values.display_order,
    active: values.active,
  };

  const result = values.id
    ? await supabase.from("product_property_definitions").update(payload).eq("id", values.id)
    : await supabase.from("product_property_definitions").insert(payload);

  if (result.error) throw new Error(result.error.message);
  revalidateProductPropertyPaths();
}

export async function disableProductPropertyDefinition(id: string) {
  const { supabase } = await requireUserContext();
  const { error } = await supabase
    .from("product_property_definitions")
    .update({ active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidateProductPropertyPaths();
}

export async function createProductPropertyOption(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = productPropertyOptionSchema.parse(input);
  const cleanValue = values.value.trim();

  const { data: existing, error: existingError } = await supabase
    .from("product_property_options")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .eq("definition_id", values.definition_id)
    .eq("value", cleanValue)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return existing as ProductPropertyOption;

  const { data, error } = await supabase
    .from("product_property_options")
    .insert({
      tenant_id: profile.tenant_id,
      definition_id: values.definition_id,
      value: cleanValue,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidateProductPropertyPaths();
  return data as ProductPropertyOption;
}

export async function getProductImportTemplates() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("product_import_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductImportTemplate[];
}

export async function saveProductImportTemplate(input: {
  name: string;
  mapping: Record<string, string>;
  header_row: number;
}) {
  const { supabase, profile } = await requireUserContext();
  const name = input.name.trim() || "default";
  const { error } = await supabase
    .from("product_import_templates")
    .upsert(
      {
        tenant_id: profile.tenant_id,
        name,
        mapping: input.mapping,
        header_row: input.header_row,
      },
      { onConflict: "tenant_id,name" },
    );

  if (error) throw new Error(error.message);
  revalidatePath("/import");
}

function revalidateProductPropertyPaths() {
  revalidatePath("/catalogs");
  revalidatePath("/products");
  revalidatePath("/import");
}
