"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getProfilelessLoginPath } from "@/features/auth/actions";
import { signIn } from "@/features/auth/services/auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function useLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const email = String(form.get("email"));
      await signIn(email, String(form.get("password")));
      const nextPath = await resolvePostLoginPath(email);
      toast.success("Sesión iniciada");
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return { loading, handleSubmit };
}

async function resolvePostLoginPath(email: string) {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) return "/dashboard";

  return getProfilelessLoginPath(email);
}
