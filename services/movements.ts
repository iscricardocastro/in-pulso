"use server";

import { revalidatePath } from "next/cache";
import { movementSchema } from "@/features/movements/schemas";
import { requireUserContext } from "@/services/context";
import type { InventoryMovement } from "@/types/database";

export async function getMovements(limit = 50) {
  const { supabase } = await requireUserContext();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*, products(name, internal_code, model, model_item:catalog_items!products_model_id_fkey(id, name, parent_id)), users(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryMovement[];
}

export async function recordMovement(input: unknown) {
  const { supabase } = await requireUserContext();
  const values = movementSchema.parse(input);
  const { error } = await supabase.rpc("record_inventory_movement", {
    p_product_id: values.product_id,
    p_type: values.type,
    p_quantity: values.quantity,
    p_comment: values.comment || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/movements");
  revalidatePath("/products");
  revalidatePath("/dashboard");
}
