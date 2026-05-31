"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Boxes, ClipboardList, Gauge, HandCoins, History, QrCode, ShoppingCart, Tags, Upload, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/sales" as Route, label: "Ventas", icon: ShoppingCart },
  { href: "/debtors" as Route, label: "Deudores", icon: HandCoins },
  { href: "/products", label: "Productos", icon: Boxes },
  { href: "/customers" as Route, label: "Clientes", icon: UsersRound },
  { href: "/catalogs", label: "Catalogos", icon: Tags },
  { href: "/purchase-orders", label: "Pedidos", icon: ClipboardList },
  { href: "/movements", label: "Movimientos", icon: History },
  { href: "/labels", label: "Etiquetas", icon: QrCode },
  { href: "/import", label: "Importar", icon: Upload },
] satisfies { href: Route; label: string; icon: typeof Gauge }[];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 p-3">
      {nav.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Button
            key={item.href}
            asChild
            className={cn(
              "group w-full justify-start rounded-xl text-muted-foreground hover:text-foreground",
              active && "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground",
            )}
            variant="ghost"
          >
            <Link aria-current={active ? "page" : undefined} href={item.href}>
              <item.icon className={cn("h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5", active && "scale-110")} />
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
    <nav className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden">
      {nav.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Button
            key={item.href}
            asChild
            className={cn(
              "group rounded-full text-muted-foreground hover:text-foreground",
              active && "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground",
            )}
            size="sm"
            variant="ghost"
          >
            <Link aria-current={active ? "page" : undefined} href={item.href}>
              <item.icon className={cn("h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5", active && "scale-110")} />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
