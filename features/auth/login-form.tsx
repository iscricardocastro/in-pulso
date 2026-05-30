"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginForm } from "@/features/auth/hooks/use-login-form";

export function LoginForm() {
  const search = useSearchParams();
  const { loading, handleSubmit } = useLoginForm();

  return (
    <Card className="w-full max-w-md overflow-hidden rounded-[1.75rem] border-slate-200/90 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.13)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/30">
      <CardHeader className="p-7 pb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-200 dark:hover:border-blue-400/20 dark:hover:bg-blue-400/10 dark:hover:text-blue-200"
            href={"/pricing" as Route}
          >
            Early Access
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 text-xs font-bold uppercase tracking-[0.08em] text-blue-700 transition-colors hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-200 dark:hover:border-pink-400/20 dark:hover:bg-pink-400/10 dark:hover:text-pink-200"
            href={"/pricing" as Route}
          >
            Ver precios
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <CardTitle className="text-2xl leading-tight tracking-tight">Entrar a Pulso</CardTitle>
        <CardDescription className="text-base">Usa tu correo y contraseña de InMexico. Si aun no tienes acceso, revisa los planes disponibles.</CardDescription>
        {search.get("error") === "missing-profile" ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            Tu usuario existe en Auth, pero no tiene perfil/tenant en `public.users`.
          </p>
        ) : null}
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
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="password">
              Contraseña
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                autoComplete="current-password"
                className="h-12 rounded-xl border-slate-200 bg-slate-50/80 pl-11 text-base shadow-inner shadow-slate-950/[0.02] focus-visible:border-blue-500 focus-visible:ring-blue-500/20 dark:border-white/10 dark:bg-white/[0.06]"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                type="password"
              />
            </div>
          </div>
          <Button
            className="h-12 w-full rounded-xl bg-gradient-to-r from-teal-500 via-blue-600 to-pink-500 text-base font-bold text-white shadow-lg shadow-blue-600/25 hover:opacity-95 hover:shadow-xl hover:shadow-blue-600/25"
            disabled={loading}
            type="submit"
          >
            {loading ? "Entrando..." : "Entrar"}
            {!loading ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
          <Link className="block text-center text-sm font-medium text-blue-700 transition-colors hover:text-pink-600 dark:text-blue-300 dark:hover:text-pink-300" href="/reset-password">
            Recuperar contraseña
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
