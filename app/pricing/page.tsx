import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Cloud,
  FileText,
  Headphones,
  LockKeyhole,
  Mail,
  Package,
  Rocket,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PricingPlans } from "@/app/pricing/pricing-plans";

export const metadata: Metadata = {
  title: "Precios | Pulso InMexico",
  description: "Planes Early Access de Pulso para inventarios, ventas, compras, reportes y control.",
};

const modules = [
  { label: "Inventarios", icon: Package, tone: "text-teal-500", delay: "pricing-delay-0" },
  { label: "Ventas", icon: ShoppingCart, tone: "text-sky-500", delay: "pricing-delay-1" },
  { label: "Compras", icon: FileText, tone: "text-blue-600", delay: "pricing-delay-2" },
  { label: "Reportes", icon: BarChart3, tone: "text-violet-600", delay: "pricing-delay-3" },
  { label: "Control", icon: Users, tone: "text-pink-500", delay: "pricing-delay-4" },
];

const trustItems = [
  { label: "Seguro y confiable", icon: ShieldCheck },
  { label: "En la nube", icon: Cloud },
  { label: "Tu informacion siempre protegida", icon: LockKeyhole },
  { label: "Soporte humano en Mexico", icon: Headphones },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/login">
          <BrandLogo
            className="h-12 w-12 rounded-2xl bg-white shadow-sm shadow-slate-950/10 ring-1 ring-slate-200 dark:bg-white/8 dark:ring-white/10"
            imageClassName="h-10 w-10"
            priority
          />
          <div className="leading-tight">
            <p className="font-semibold tracking-[0.22em] text-slate-950 dark:text-white">PULSO</p>
            <p className="text-xs font-semibold tracking-[0.28em] text-slate-500 dark:text-slate-300">DE INMEXICO</p>
          </div>
        </Link>
        <Button asChild className="rounded-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">
          <Link href="/login">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
        <div className="text-center">
          <BrandLogo className="mx-auto h-28 w-28" imageClassName="h-28 w-28" priority />
          <div className="mt-5 flex items-center justify-center gap-4">
            <span className="pricing-line h-px w-16 bg-teal-400" />
            <p className="text-sm font-bold tracking-[0.36em] text-slate-700 dark:text-slate-200">DE INMEXICO</p>
            <span className="pricing-line h-px w-16 bg-pink-500" />
          </div>
          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            El sistema que da <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-pink-500 bg-clip-text text-transparent">pulso</span> a tu negocio.
          </h1>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-2 overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-5">
          {modules.map((item) => (
            <div key={item.label} className={cn("pricing-module-motion flex min-h-24 flex-col items-center justify-center gap-2 border-slate-200/80 px-3 text-center last:border-0 dark:border-white/10 sm:border-r", item.delay)}>
              <item.icon className={cn("pricing-module-icon h-7 w-7", item.tone)} strokeWidth={2.2} />
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-800 dark:text-slate-100">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="pricing-gradient-motion mx-auto mt-7 flex max-w-3xl items-center justify-center rounded-full bg-gradient-to-r from-teal-500 via-blue-600 to-pink-500 px-5 py-3 text-white shadow-lg shadow-blue-600/20">
          <Rocket className="mr-3 h-7 w-7 shrink-0 rounded-full bg-white p-1 text-blue-600" />
          <div className="text-left sm:text-center">
            <p className="text-lg font-bold uppercase tracking-[0.2em] sm:text-2xl">Early Access</p>
            <p className="text-sm text-white/90 sm:text-base">Precios de lanzamiento por tiempo limitado</p>
          </div>
        </div>

        <PricingPlans />

        <div className="mt-8 grid gap-4 border-y border-slate-200 py-5 dark:border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div key={item.label} className="flex items-center justify-center gap-3 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
              <item.icon className="h-7 w-7 text-blue-600 dark:text-blue-300" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="pricing-soft-pop mx-auto mt-8 max-w-4xl rounded-2xl bg-slate-100 px-5 py-4 text-center text-sm text-slate-700 dark:bg-white/8 dark:text-slate-200 sm:text-base">
          Promocion Early Access valida por tiempo limitado. <span className="font-bold text-pink-600">Aprovecha ahora.</span>
        </div>

        <section className="mt-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Listo para llevar tu negocio al <span className="text-blue-600">siguiente nivel?</span>
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Contactanos y con gusto te asesoramos.</p>
          <div className="mx-auto mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
            <a className="pricing-contact-motion flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-teal-500/10" href="https://wa.me/524521171022">
              <Headphones className="h-8 w-8 text-teal-500" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-300">WhatsApp</p>
                <p className="text-xl font-bold">452 117 1022</p>
              </div>
            </a>
            <a className="pricing-contact-motion flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-blue-500/10" href="mailto:iscricardocastro@outlook.com">
              <Mail className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-300">Correo</p>
                <p className="text-base font-bold sm:text-lg">iscricardocastro@outlook.com</p>
              </div>
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
