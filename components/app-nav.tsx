import Link from "next/link";
import type { Route } from "next";
import { Boxes, ClipboardList, Gauge, HandCoins, History, QrCode, ShoppingCart, Tags, Upload, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/sales" as Route, label: "Sales", icon: ShoppingCart },
  { href: "/debtors" as Route, label: "Deudores", icon: HandCoins },
  { href: "/products", label: "Productos", icon: Boxes },
  { href: "/customers" as Route, label: "Clientes", icon: UsersRound },
  { href: "/catalogs", label: "Catalogos", icon: Tags },
  { href: "/purchase-orders", label: "Pedidos", icon: ClipboardList },
  { href: "/movements", label: "Movimientos", icon: History },
  { href: "/labels", label: "Etiquetas", icon: QrCode },
  { href: "/import", label: "Importar", icon: Upload },
] satisfies { href: Route; label: string; icon: typeof Gauge }[];

export function DesktopNav() {
  return (
    <nav className="space-y-1 overflow-y-auto p-3">
      {nav.map((item) => (
        <Button key={item.href} asChild className="group w-full justify-start rounded-xl text-muted-foreground hover:text-foreground" variant="ghost">
          <Link href={item.href}>
            <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

export function MobileNav() {
  return (
    <nav className="grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4 md:grid-cols-5 lg:hidden">
      {nav.map((item) => (
        <Button key={item.href} asChild className="group w-full justify-start rounded-lg text-muted-foreground hover:text-foreground" size="sm" variant="ghost">
          <Link href={item.href}>
            <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
