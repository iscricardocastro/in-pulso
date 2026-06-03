import { BrandLogo } from "@/components/brand-logo";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { MainSearch } from "@/components/main-search";
import { PortalFooter } from "@/components/portal-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPlatformAdminContext, requireUserContext } from "@/services/context";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldCheck, UserRound } from "lucide-react";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUserContext();
  const platformContext = await getPlatformAdminContext();
  const { data: company } = await supabase
    .from("tenants")
    .select("name, slug, image_url")
    .eq("id", profile.tenant_id)
    .single();
  const companyName = company?.name || "Pulso";
  const companySubtitle = company?.slug || "InMexico";

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border/70 bg-card/90 backdrop-blur-xl lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-border/70 px-5">
          <div className="motion-press flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card shadow-sm shadow-slate-950/10 ring-1 ring-border/70 dark:bg-foreground/5 dark:shadow-black/20">
            <CompanyImage imageUrl={company?.image_url ?? null} name={companyName} className="h-full w-full p-2" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{companyName}</p>
            <p className="truncate text-xs text-muted-foreground">{companySubtitle}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DesktopNav />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/85 shadow-sm shadow-slate-950/[0.025] backdrop-blur-xl transition-shadow duration-200">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between lg:px-8">
            <MainSearch />
            <div className="flex items-center justify-between gap-2 md:justify-start">
              <div className="flex items-center gap-2 md:hidden">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card shadow-sm shadow-slate-950/10 ring-1 ring-border/70 dark:bg-foreground/5 dark:shadow-black/20">
                  <CompanyImage imageUrl={company?.image_url ?? null} name={companyName} className="h-full w-full p-2" />
                </div>
                <span className="max-w-36 truncate text-sm font-semibold">{companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild className="hidden max-w-52 px-3 md:inline-flex" size="sm" variant="ghost">
                  <Link href="/profile">
                    <UserRound className="h-4 w-4" />
                    <span className="truncate">{profile.full_name || profile.email}</span>
                  </Link>
                </Button>
                {platformContext ? (
                  <Button asChild className="hidden md:inline-flex" size="sm" variant="outline">
                    <Link href="/admin">
                      <ShieldCheck className="h-4 w-4" />
                      Admin
                    </Link>
                  </Button>
                ) : null}
                <ThemeToggle />
                <SignOutButton />
              </div>
            </div>
          </div>
          <MobileNav />
        </header>
        <main className="animate-enter mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">{children}</main>
        <PortalFooter />
      </div>
    </div>
  );
}

function CompanyImage({ imageUrl, name, className }: { imageUrl: string | null; name: string; className: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={`Imagen de ${name}`} className={`${className} object-contain`} src={imageUrl} />;
  }

  return <BrandLogo imageClassName="h-12 w-12" priority />;
}
