"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Gauge,
  Settings2,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

const adminNav: AdminNavItem[] = [
  { href: "/admin" as Route, label: "Dashboard", icon: Gauge },
  { href: "/admin/companies" as Route, label: "Companias", icon: Building2 },
  { href: "/admin/users" as Route, label: "Usuarios", icon: UsersRound },
  { href: "/admin/plans" as Route, label: "Planes", icon: Settings2 },
  { href: "/admin/billing" as Route, label: "Facturacion", icon: Banknote },
];

export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border/80 bg-card/95 lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-border/70 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Pulso Admin</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {adminNav.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

            return (
              <Button
                key={item.label}
                asChild
                className={cn(
                  "w-full justify-start text-muted-foreground hover:text-foreground",
                  active && "bg-accent text-accent-foreground ring-1 ring-primary/15",
                )}
                variant="ghost"
              >
                <Link aria-current={active ? "page" : undefined} href={item.href}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
        <div className="border-t border-border/70 p-3">
          <Button asChild className="w-full justify-start" variant="ghost">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Volver a operacion
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/90 backdrop-blur-xl">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary lg:hidden">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Superadmin</p>
                <p className="text-xs text-muted-foreground">Planes, companias y facturacion</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Operacion
                </Link>
              </Button>
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
            {adminNav.map((item) => {
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

              return (
                <Button key={item.label} asChild size="sm" variant={active ? "secondary" : "outline"}>
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
