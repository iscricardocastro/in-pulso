import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireUserContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, tenant_id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/login?error=missing-profile");
  }

  return { supabase, user, profile };
}
