"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  HandCoins,
  History,
  Menu,
  QrCode,
  ReceiptText,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Upload,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: Route; label: string; icon: LucideIcon };

const navGroups = [
  {
    label: "Inicio",
    items: [{ href: "/dashboard" as Route, label: "Dashboard", icon: Gauge }],
  },
  {
    label: "Operacion",
    items: [
      { href: "/sales" as Route, label: "Ventas", icon: ShoppingCart },
      { href: "/service-notes" as Route, label: "Notas", icon: ReceiptText },
      { href: "/reports/daily" as Route, label: "Reporte diario", icon: BarChart3 },
      { href: "/debtors" as Route, label: "Deudores", icon: HandCoins },
    ],
  },
  {
    label: "Inventario",
    items: [
      { href: "/products" as Route, label: "Productos", icon: Boxes },
      { href: "/inventory-audits" as Route, label: "Conteos", icon: ClipboardCheck },
      { href: "/purchase-orders" as Route, label: "Pedidos", icon: ClipboardList },
      { href: "/movements" as Route, label: "Movimientos", icon: History },
    ],
  },
  {
    label: "Directorio",
    items: [
      { href: "/customers" as Route, label: "Clientes", icon: UsersRound },
      { href: "/suppliers" as Route, label: "Proveedores", icon: Truck },
      { href: "/catalogs" as Route, label: "Catalogos", icon: Tags },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { href: "/labels" as Route, label: "Etiquetas", icon: QrCode },
      { href: "/import" as Route, label: "Importar", icon: Upload },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/profile" as Route, label: "Mi perfil", icon: UserRound },
      { href: "/settings" as Route, label: "Configuracion", icon: Settings },
    ],
  },
] satisfies { label: string; items: NavItem[] }[];

const nav = navGroups.flatMap((group) => group.items);

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 overflow-y-auto p-3">
      {navGroups.map((group) => (
        <div key={group.label} className="space-y-1 pb-2 last:pb-0">
          <p className="px-3 pt-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/75">
            {group.label}
          </p>
          {group.items.map((item) => {
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
        </div>
      ))}
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
          className="animate-slide-panel mt-2 max-h-[min(68vh,34rem)] space-y-3 overflow-y-auto rounded-xl border border-border/80 bg-card p-2 shadow-md shadow-slate-950/10"
          id="mobile-navigation"
        >
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-2 pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/75">
                {group.label}
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
