"use server";

import { isPlatformAdminEmail, resolveAuthenticatedHomePath } from "@/services/context";

export async function getPostLoginPath() {
  return resolveAuthenticatedHomePath();
}

export async function getProfilelessLoginPath(email: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para validar superadmin.");
  }

  return (await isPlatformAdminEmail(email)) ? "/admin" : "/login?error=missing-profile";
}
