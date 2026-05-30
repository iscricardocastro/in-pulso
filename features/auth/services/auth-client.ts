"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export async function signIn(email: string, password: string) {
  const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function sendPasswordResetEmail(email: string, redirectTo: string) {
  const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const { error } = await createSupabaseBrowserClient().auth.signOut();
  if (error) throw new Error(error.message);
}

