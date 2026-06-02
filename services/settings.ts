"use server";

import { revalidatePath } from "next/cache";
import { companySettingsSchema } from "@/features/settings/schemas";
import { requireUserContext } from "@/services/context";
import type { Tenant } from "@/types/database";

export async function getCompanySettings() {
  const { supabase, profile } = await requireUserContext();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, tenant_id, name, slug, legal_name, tax_id, phone, email, address, postal_code, city, state, country, image_url, image_path, created_at, updated_at")
    .eq("id", profile.tenant_id)
    .single();

  if (error) throw new Error(error.message);
  return data as Tenant;
}

export async function updateCompanySettings(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = companySettingsSchema.parse(input);

  const { error } = await supabase
    .from("tenants")
    .update({
      name: values.name,
      slug: values.slug,
      legal_name: cleanOptional(values.legal_name),
      tax_id: cleanOptional(values.tax_id),
      phone: cleanOptional(values.phone),
      email: cleanOptional(values.email),
      address: cleanOptional(values.address),
      postal_code: cleanOptional(values.postal_code),
      city: cleanOptional(values.city),
      state: cleanOptional(values.state),
      country: cleanOptional(values.country),
      image_url: cleanOptional(values.image_url),
      image_path: cleanOptional(values.image_path),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.tenant_id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/sales");
  revalidatePath("/inventory-audits");
}

function cleanOptional(value: string | undefined) {
  const clean = value?.trim();
  return clean ? clean : null;
}
