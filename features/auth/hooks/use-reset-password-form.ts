"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { sendPasswordResetEmail } from "@/features/auth/services/auth-client";

export function useResetPasswordForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      await sendPasswordResetEmail(String(form.get("email")), `${window.location.origin}/login`);
      toast.success("Correo enviado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar correo");
    } finally {
      setLoading(false);
    }
  }

  return { loading, handleSubmit };
}
