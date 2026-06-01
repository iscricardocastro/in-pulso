"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  HandCoins,
  History,
  Menu,
  QrCode,
  ShoppingCart,
  Tags,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/sales" as Route, label: "Sales", icon: ShoppingCart },
  { href: "/debtors" as Route, label: "Deudores", icon: HandCoins },
  { href: "/products", label: "Productos", icon: Boxes },
  { href: "/inventory-audits" as Route, label: "Conteos", icon: ClipboardCheck },
  { href: "/customers" as Route, label: "Clientes", icon: UsersRound },
  { href: "/catalogs", label: "Catalogos", icon: Tags },
  { href: "/purchase-orders", label: "Pedidos", icon: ClipboardList },
  { href: "/movements", label: "Movimientos", icon: History },
  { href: "/labels", label: "Etiquetas", icon: QrCode },
  { href: "/import", label: "Importar", icon: Upload },
] satisfies { href: Route; label: string; icon: typeof Gauge }[];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 overflow-y-auto p-3">
      {nav.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Button
            key={item.href}
            asChild
            className={cn(
              "group w-full justify-start rounded-xl text-muted-foreground hover:text-foreground",
              active &&
                "bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/15 hover:bg-accent hover:text-accent-foreground",
            )}
            variant="ghost"
          >
            <Link aria-current={active ? "page" : undefined} href={item.href}>
              <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="px-4 pb-3 lg:hidden">
      <Button
        aria-controls="mobile-navigation"
        aria-expanded={open}
        aria-label={open ? "Cerrar menu" : "Abrir menu"}
        className="h-11 w-full justify-between border-border/80 bg-card/95 px-3 text-foreground shadow-sm shadow-slate-950/5 hover:border-primary/30 hover:bg-accent"
        onClick={() => setOpen((current) => !current)}
        variant="outline"
      >
        <span className="flex items-center gap-2">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          Menu
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {nav.find((item) => isActivePath(pathname, item.href))?.label ?? "Secciones"}
        </span>
      </Button>

      {open ? (
        <nav
          aria-label="Navegacion principal"
          className="animate-slide-panel mt-2 grid max-h-[min(68vh,34rem)] grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-border/80 bg-card p-2 shadow-md shadow-slate-950/10 sm:grid-cols-2"
          id="mobile-navigation"
        >
          {nav.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Button
                key={item.href}
                asChild
                className={cn(
                  "group h-11 w-full justify-start rounded-lg text-muted-foreground hover:text-foreground",
                  active &&
                    "bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/15 hover:bg-accent hover:text-accent-foreground",
                )}
                variant="ghost"
              >
                <Link aria-current={active ? "page" : undefined} href={item.href} onClick={() => setOpen(false)}>
                  <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
