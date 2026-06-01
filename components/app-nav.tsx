"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardCheck, ClipboardList, Gauge, HandCoins, History, QrCode, ShoppingCart, Tags, Upload, UsersRound } from "lucide-react";
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

  return (
    <nav className="grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4 md:grid-cols-5 lg:hidden">
      {nav.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Button
            key={item.href}
            asChild
            className={cn(
              "group w-full justify-start rounded-lg text-muted-foreground hover:text-foreground",
              active &&
                "bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/15 hover:bg-accent hover:text-accent-foreground",
            )}
            size="sm"
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

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
