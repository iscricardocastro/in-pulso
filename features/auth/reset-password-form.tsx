"use client";

import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPasswordForm } from "@/features/auth/hooks/use-reset-password-form";

export function ResetPasswordForm() {
  const { loading, mode, handleRequestSubmit, handleUpdateSubmit } = useResetPasswordForm();
  const isUpdateMode = mode === "update";

  return (
    <Card className="pricing-soft-pop w-full max-w-md overflow-hidden rounded-[1.75rem] border-slate-200/90 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.13)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/30">
      <CardHeader className="p-7 pb-5">
        <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200">
          Acceso seguro
        </div>
        <CardTitle className="text-2xl leading-tight tracking-tight">
          {isUpdateMode ? "Crear nueva contraseña" : "Recuperar contraseña"}
        </CardTitle>
        <CardDescription className="text-base">
          {isUpdateMode
            ? "Escribe una contraseña nueva para volver a entrar a Pulso."
            : "Enviaremos instrucciones al correo registrado en Pulso."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-7 pt-0">
        {mode === "checking" ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
            <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-300" />
            Validando enlace...
          </div>
        ) : isUpdateMode ? (
          <form className="space-y-5" onSubmit={handleUpdateSubmit}>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="password">
                Nueva contraseña
              </Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  autoComplete="new-password"
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/80 pl-11 text-base shadow-inner shadow-slate-950/[0.02] focus-visible:border-blue-500 focus-visible:ring-blue-500/20 dark:border-white/10 dark:bg-white/[0.06]"
                  id="password"
                  minLength={8}
                  name="password"
                  placeholder="Mínimo 8 caracteres"
                  required
                  type="password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="confirm-password">
                Confirmar contraseña
              </Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  autoComplete="new-password"
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/80 pl-11 text-base shadow-inner shadow-slate-950/[0.02] focus-visible:border-blue-500 focus-visible:ring-blue-500/20 dark:border-white/10 dark:bg-white/[0.06]"
                  id="confirm-password"
                  minLength={8}
                  name="confirm-password"
                  placeholder="Repite contraseña"
                  required
                  type="password"
                />
              </div>
            </div>
            <Button
              className="pricing-gradient-motion h-12 w-full rounded-xl bg-gradient-to-r from-teal-500 via-blue-600 to-pink-500 text-base font-bold text-white shadow-lg shadow-blue-600/25 hover:opacity-95 hover:shadow-xl hover:shadow-blue-600/25"
              disabled={loading}
              type="submit"
            >
              {loading ? "Guardando..." : "Guardar contraseña"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleRequestSubmit}>
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
        )}
      </CardContent>
    </Card>
  );
}
