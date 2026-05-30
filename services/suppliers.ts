"use server";

import { revalidatePath } from "next/cache";
import { supplierSchema } from "@/features/suppliers/schemas";
import { requireUserContext } from "@/services/context";
import type { Supplier } from "@/types/database";

export async function getSuppliers() {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Supplier[];
}

export async function upsertSupplier(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = supplierSchema.parse(input);
  const payload = {
    tenant_id: profile.tenant_id,
    name: values.name,
    contact: values.contact || null,
    phone: values.phone || null,
    email: values.email || null,
    country: values.country || null,
    average_delivery_days: values.average_delivery_days,
    payment_terms: values.payment_terms || null,
    notes: values.notes || null,
  };

  const { error } = values.id
    ? await supabase.from("suppliers").update(payload).eq("id", values.id)
    : await supabase.from("suppliers").insert(payload);

  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
  revalidatePath("/products");
  revalidatePath("/purchase-orders");
}

export async function createSupplier(name: string) {
  const { supabase, profile } = await requireUserContext();
  const cleanName = name.trim();
  if (cleanName.length < 2) throw new Error("Nombre requerido");

  const { data, error } = await supabase
    .from("suppliers")
    .upsert(
      {
        tenant_id: profile.tenant_id,
        name: cleanName,
        average_delivery_days: 0,
      },
      { onConflict: "tenant_id,name" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
  revalidatePath("/products");
  revalidatePath("/purchase-orders");
  return data as Supplier;
}

export async function deleteSupplier(id: string) {
  const { supabase } = await requireUserContext();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
  revalidatePath("/products");
  revalidatePath("/purchase-orders");
}
