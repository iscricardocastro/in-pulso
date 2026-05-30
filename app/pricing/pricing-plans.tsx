"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Send, Store, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const whatsappNumber = "524521171022";

const plans = [
  {
    name: "Basico",
    description: "Ideal para iniciar y llevar el control de tu negocio.",
    oldPrice: "$499",
    price: "$349",
    period: "/ mes",
    tone: "teal",
    cta: "Ahorrar $150 / mes",
    features: ["Inventarios", "Ventas", "Compras", "Reportes basicos", "1 usuario"],
  },
  {
    name: "Premium",
    description: "Mas herramientas para hacer crecer tu negocio.",
    oldPrice: "$999",
    price: "$699",
    period: "/ mes",
    tone: "blue",
    popular: true,
    cta: "Ahorrar $300 / mes",
    features: ["Todo lo de Basico", "Reportes avanzados", "Control de usuarios", "Alertas y notificaciones", "Hasta 5 usuarios"],
  },
  {
    name: "Empresa",
    description: "Para negocios con varias sucursales y operaciones avanzadas.",
    price: "Por sucursales",
    period: "Precio personalizado segun tus necesidades.",
    tone: "pink",
    cta: "Solicitar cotizacion",
    features: ["Todo lo de Premium", "Sucursales ilimitadas", "Permisos por sucursal", "Soporte prioritario", "Onboarding personalizado"],
  },
];

type Plan = (typeof plans)[number];

function planClasses(tone: string, popular?: boolean) {
  if (popular) {
    return {
      card: "pricing-float-delay border-blue-600 shadow-[0_24px_70px_rgba(37,99,235,0.16)] ring-1 ring-pink-500/80",
      title: "text-blue-600",
      price: "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent",
      icon: "text-blue-600",
      cta: "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:opacity-95",
      badge: "bg-gradient-to-r from-blue-600 to-violet-600 text-white",
    };
  }

  if (tone === "pink") {
    return {
      card: "border-slate-200/80",
      title: "text-pink-600",
      price: "text-pink-600",
      icon: "text-pink-600",
      cta: "border-pink-500 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10",
      badge: "",
    };
  }

  return {
    card: "border-slate-200/80",
    title: "text-teal-600",
    price: "text-teal-600",
    icon: "text-teal-600",
    cta: "bg-teal-500 text-white hover:bg-teal-600",
    badge: "",
  };
}

function getPlanDetails(plan: Plan) {
  if (plan.name === "Empresa") {
    return "Cotizacion por sucursales";
  }

  return `${plan.price} ${plan.period}`;
}

export function PricingPlans() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    document.body.classList.toggle("has-modal", Boolean(selectedPlan));

    return () => document.body.classList.remove("has-modal");
  }, [selectedPlan]);

  return (
    <>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const styles = planClasses(plan.tone, plan.popular);

          return (
            <article
              key={plan.name}
              className={cn(
                "pricing-card-motion relative flex min-h-[31rem] flex-col rounded-[1.75rem] border bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:bg-white/[0.04]",
                styles.card,
              )}
            >
              {plan.popular ? (
                <div className={cn("absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-6 py-2 text-xs font-bold uppercase tracking-[0.14em]", styles.badge)}>
                  Mas popular
                </div>
              ) : null}
              <div className="text-center">
                <h2 className={cn("text-2xl font-bold uppercase tracking-[0.08em]", styles.title)}>{plan.name}</h2>
                <p className="mx-auto mt-4 max-w-60 text-base leading-7 text-slate-700 dark:text-slate-200">{plan.description}</p>
              </div>
              <div className="my-7 h-px bg-slate-200 dark:bg-white/10" />
              {plan.name === "Empresa" ? (
                <div className="text-center">
                  <Store className="mx-auto h-16 w-16 text-pink-600" strokeWidth={2} />
                  <p className="mt-5 text-2xl font-bold uppercase tracking-[0.06em] text-pink-600">{plan.price}</p>
                  <p className="mx-auto mt-3 max-w-60 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.period}</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-500 line-through">{plan.oldPrice}</p>
                  <div className="mt-1 flex items-start justify-center gap-2">
                    <span className={cn("pt-3 text-3xl font-bold", styles.price)}>$</span>
                    <p className={cn("text-7xl font-black tracking-tight", styles.price)}>{plan.price.replace("$", "")}</p>
                  </div>
                  <p className="text-slate-500 dark:text-slate-300">{plan.period}</p>
                </div>
              )}
              <ul className="mt-7 space-y-3 text-sm font-medium text-slate-800 dark:text-slate-100">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", styles.icon)} strokeWidth={3} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={cn("mt-auto h-11 rounded-full text-sm font-bold uppercase tracking-[0.08em]", styles.cta)}
                onClick={() => setSelectedPlan(plan)}
                type="button"
                variant={plan.tone === "pink" ? "outline" : "default"}
              >
                {plan.cta}
              </Button>
            </article>
          );
        })}
      </div>

      {selectedPlan ? <PricingLeadModal onClose={() => setSelectedPlan(null)} plan={selectedPlan} /> : null}
    </>
  );
}

function PricingLeadModal({ onClose, plan }: { onClose: () => void; plan: Plan }) {
  const planDetails = useMemo(() => getPlanDetails(plan), [plan]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const business = String(formData.get("business") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    const whatsappMessage = [
      "Hola, quiero informacion de Pulso.",
      `Plan: ${plan.name}`,
      `Precio: ${planDetails}`,
      name ? `Nombre: ${name}` : "",
      business ? `Negocio: ${business}` : "",
      phone ? `Telefono: ${phone}` : "",
      message ? `Mensaje: ${message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 pt-10 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="pricing-form-title">
      <button aria-label="Cerrar formulario" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <div className="animate-pop relative w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Pulso Early Access</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight" id="pricing-form-title">
              Solicitar {plan.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{planDetails}</p>
          </div>
          <Button aria-label="Cerrar" className="rounded-full" onClick={onClose} size="icon" type="button" variant="ghost">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pricing-name">Nombre</Label>
              <Input id="pricing-name" name="name" placeholder="Tu nombre" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricing-phone">Telefono</Label>
              <Input id="pricing-phone" name="phone" placeholder="452 000 0000" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricing-business">Negocio</Label>
            <Input id="pricing-business" name="business" placeholder="Nombre de tu negocio" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricing-message">Mensaje</Label>
            <Textarea id="pricing-message" name="message" placeholder="Cuentame que necesitas controlar primero." rows={4} />
          </div>
          <Button className="h-12 w-full rounded-xl bg-gradient-to-r from-teal-500 via-blue-600 to-pink-500 text-base font-bold text-white hover:opacity-95" type="submit">
            Enviar a WhatsApp
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
