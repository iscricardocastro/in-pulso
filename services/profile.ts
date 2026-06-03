"use server";

import { revalidatePath } from "next/cache";
import { profileSchema } from "@/features/profile/schemas";
import { requireUserContext } from "@/services/context";
import type { UserProfile } from "@/types/database";

export async function getMyProfile() {
  const { supabase, profile } = await requireUserContext();

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("id", profile.tenant_id)
    .single();

  if (tenantError) throw new Error(tenantError.message);

  return {
    company: tenant as { id: string; name: string; slug: string },
    profile: profile as UserProfile,
  };
}

export async function updateMyProfile(input: unknown) {
  const { supabase, profile } = await requireUserContext();
  const values = profileSchema.parse(input);

  const { error } = await supabase
    .from("users")
    .update({
      full_name: cleanOptional(values.full_name),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
    .eq("tenant_id", profile.tenant_id);

  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

function cleanOptional(value: string | undefined) {
  const clean = value?.trim();
  return clean ? clean : null;
}
