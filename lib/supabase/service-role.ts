import { createClient } from "@supabase/supabase-js";

export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Falta configurar SUPABASE_SERVICE_ROLE_KEY para acciones superadmin.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
