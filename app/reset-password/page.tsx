import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, BarChart3, Cloud, FileText, LockKeyhole, Package, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { cn } from "@/lib/utils";

const modules = [
  { label: "Inventarios", icon: Package, tone: "text-teal-500", delay: "pricing-delay-0" },
  { label: "Ventas", icon: ShoppingCart, tone: "text-sky-500", delay: "pricing-delay-1" },
  { label: "Compras", icon: FileText, tone: "text-blue-600", delay: "pricing-delay-2" },
  { label: "Reportes", icon: BarChart3, tone: "text-violet-600", delay: "pricing-delay-3" },
  { label: "Control", icon: Users, tone: "text-pink-500", delay: "pricing-delay-4" },
];

const trustItems = [
  { label: "Enlace seguro", icon: ShieldCheck },
  { label: "Acceso en la nube", icon: Cloud },
  { label: "Cuenta protegida", icon: LockKeyhole },
];

export default function ResetPasswordPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(236,72,153,0.14),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.72))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(20,184,166,0.16),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(236,72,153,0.18),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.84))]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="animate-enter hidden lg:block">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/88 p-8 shadow-[0_28px_90px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/30">
            <div className="relative flex flex-col items-center text-center">
              <BrandLogo
                className="mb-5 h-28 w-28 rounded-[1.75rem] bg-white shadow-sm shadow-slate-950/10 ring-1 ring-slate-200 dark:bg-white/8 dark:shadow-black/20 dark:ring-white/10"
                imageClassName="h-24 w-24"
                priority
              />
              <p className="text-sm font-semibold uppercase tracking-[0.42em] text-slate-500 dark:text-slate-300">Pulso</p>
              <div className="mt-3 flex items-center gap-4">
                <span className="pricing-line h-px w-16 bg-teal-400" />
                <p className="text-sm font-semibold tracking-[0.36em] text-slate-700 dark:text-slate-200">DE INMEXICO</p>
                <span className="pricing-line h-px w-16 bg-pink-500" />
              </div>
              <h1 className="mt-7 max-w-xl text-4xl font-semibold leading-tight tracking-tight">
                Recupera acceso sin perder el <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-pink-500 bg-clip-text text-transparent">pulso</span> de tu negocio.
              </h1>

              <div className="mt-8 grid w-full grid-cols-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.05]">
                {modules.map((item) => (
                  <div key={item.label} className={cn("pricing-module-motion flex min-h-24 flex-col items-center justify-center gap-2 px-3 text-center", item.delay)}>
                    <item.icon className={cn("pricing-module-icon h-7 w-7", item.tone)} strokeWidth={2.2} />
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-800 dark:text-slate-100">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid w-full grid-cols-3 gap-3">
                {trustItems.map((item) => (
                  <div key={item.label} className="pricing-contact-motion flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-center text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                    <item.icon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <BrandLogo
              className="mb-4 h-24 w-24 rounded-[1.5rem] bg-white shadow-sm shadow-slate-950/10 ring-1 ring-slate-200 dark:bg-white/8 dark:shadow-black/20 dark:ring-white/10"
              imageClassName="h-20 w-20"
              priority
            />
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-500 dark:text-slate-300">Pulso</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Acceso seguro</h1>
            <p className="mt-2 max-w-xs text-sm text-slate-600 dark:text-slate-300">Recupera tu cuenta y vuelve al control operativo.</p>
          </div>
        <ResetPasswordForm />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-blue-500/10" href="/login">
              <ArrowLeft className="h-4 w-4" />
              Volver a login
            </Link>
            <Link className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-200" href={"/pricing" as Route}>
              Ver precios
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
