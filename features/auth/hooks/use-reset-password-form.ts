"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendPasswordResetEmail, signOut, updatePassword } from "@/features/auth/services/auth-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ResetMode = "request" | "checking" | "update";

export function useResetPasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ResetMode>("request");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (hasRecoveryMarker()) {
      queueMicrotask(() => setMode("checking"));
      supabase.auth.getSession().then(({ data }) => {
        setMode(data.session ? "update" : "request");
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      await sendPasswordResetEmail(String(form.get("email")), getResetRedirectUrl());
      toast.success("Correo enviado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar correo");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirm-password") ?? "");

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmation) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      await updatePassword(password);
      await signOut();
      toast.success("Contraseña actualizada");
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  }

  return { loading, mode, handleRequestSubmit, handleUpdateSubmit };
}

function getResetRedirectUrl() {
  const { hostname, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  if (isLocal) return `${origin}/reset-password`;

  return "https://pulso.inmexico.dev/reset-password";
}

function hasRecoveryMarker() {
  if (typeof window === "undefined") return false;

  return (
    window.location.search.includes("type=recovery") ||
    window.location.search.includes("code=") ||
    window.location.hash.includes("type=recovery") ||
    window.location.hash.includes("access_token=")
  );
}
