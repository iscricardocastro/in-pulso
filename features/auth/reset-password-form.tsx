"use client";

import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPasswordForm } from "@/features/auth/hooks/use-reset-password-form";

export function ResetPasswordForm() {
  const { loading, handleSubmit } = useResetPasswordForm();

  return (
    <Card className="pricing-soft-pop w-full max-w-md overflow-hidden rounded-[1.75rem] border-slate-200/90 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.13)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/30">
      <CardHeader className="p-7 pb-5">
        <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
          Acceso seguro
        </div>
        <CardTitle className="text-2xl leading-tight tracking-tight">Recuperar contrasena</CardTitle>
        <CardDescription className="text-base">Enviaremos instrucciones al correo registrado en Pulso.</CardDescription>
      </CardHeader>
      <CardContent className="p-7 pt-0">
        <form
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="email">
              Correo
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                autoComplete="email"
                className="h-12 rounded-xl border-slate-200 bg-slate-50/80 pl-11 text-base shadow-inner shadow-slate-950/[0.02] focus-visible:border-blue-500 focus-visible:ring-blue-500/20 dark:border-white/10 dark:bg-white/[0.06]"
                id="email"
                name="email"
                placeholder="tu@negocio.com"
                required
                type="email"
              />
            </div>
          </div>
          <Button
            className="pricing-gradient-motion h-12 w-full rounded-xl bg-gradient-to-r from-teal-500 via-blue-600 to-pink-500 text-base font-bold text-white shadow-lg shadow-blue-600/25 hover:opacity-95 hover:shadow-xl hover:shadow-blue-600/25"
            disabled={loading}
            type="submit"
          >
            {loading ? "Enviando..." : "Enviar enlace"}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
