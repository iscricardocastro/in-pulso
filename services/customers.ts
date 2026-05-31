"use server";

import { revalidatePath } from "next/cache";
import { customerSchema } from "@/features/customers/schemas";
import { requireUserContext } from "@/services/context";
import type { Customer } from "@/types/database";

export async function getCustomers() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Customer[];
}

export async function upsertCustomer(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = customerSchema.parse(input);
  const payload = {
    tenant_id: profile.tenant_id,
    name: values.name.trim(),
    address: values.address || null,
    postal_code: values.postal_code || null,
    city: values.city || null,
    country: values.country || null,
    state: values.state || null,
    phone: values.phone || null,
    email: values.email || null,
  };

  const { error } = values.id
    ? await supabase.from("customers").update(payload).eq("id", values.id)
    : await supabase.from("customers").insert(payload);

  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}

export async function createCustomer(name: string) {
  const { supabase, profile } = await requireUserContext();
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Nombre requerido");

  const { data, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: profile.tenant_id,
      name: cleanName,
    })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: existing, error: existingError } = await supabase
      .from("customers")
      .select("*")
      .eq("name", cleanName)
      .single();
    if (existingError) throw new Error(existingError.message);
    return existing as Customer;
  }

  if (error) throw new Error(error.message);
  revalidatePath("/customers");
  return data as Customer;
}

export async function deleteCustomer(id: string) {
  const { supabase } = await requireUserContext();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}
