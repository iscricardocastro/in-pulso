import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function requireUserContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, tenant_id, email, full_name, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    if (await isPlatformAdminEmail(user.email)) redirect("/admin");
    redirect("/login?error=missing-profile");
  }

  return { supabase, user, profile };
}

export async function getPlatformAdminContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const service = createSupabaseServiceRoleClient();
  const { data: platformUser } = await service
    .from("platform_users")
    .select("id, email, role")
    .ilike("email", user.email)
    .eq("role", "superadmin")
    .maybeSingle();

  if (!platformUser) return null;

  return { supabase, service, user, platformUser };
}

export async function requirePlatformAdminContext() {
  const context = await getPlatformAdminContext();

  if (!context) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    redirect(user ? "/dashboard" : "/login");
  }

  return context;
}

export async function resolveAuthenticatedHomePath() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";
  if (await isPlatformAdminEmail(user.email)) return "/admin";

  return "/dashboard";
}

export async function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;

  const service = createSupabaseServiceRoleClient();
  const { data } = await service
    .from("platform_users")
    .select("id")
    .ilike("email", email)
    .eq("role", "superadmin")
    .maybeSingle();

  return Boolean(data);
}
