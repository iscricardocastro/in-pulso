import { BrandLogo } from "@/components/brand-logo";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { MainSearch } from "@/components/main-search";
import { PortalFooter } from "@/components/portal-footer";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUserContext } from "@/services/context";
import { SignOutButton } from "@/features/auth/sign-out-button";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUserContext();

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border/70 bg-card/90 backdrop-blur-xl lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-border/70 px-5">
          <div className="motion-press flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card shadow-sm shadow-slate-950/10 ring-1 ring-border/70 dark:bg-foreground/5 dark:shadow-black/20">
            <BrandLogo imageClassName="h-12 w-12" priority />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Pulso</p>
            <p className="text-xs text-muted-foreground">InMexico</p>
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
                <BrandLogo
                  className="h-12 w-12 rounded-2xl bg-card shadow-sm shadow-slate-950/10 ring-1 ring-border/70 dark:bg-foreground/5 dark:shadow-black/20"
                  imageClassName="h-10 w-10"
                  priority
                />
                <span className="text-sm font-semibold">Pulso</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="hidden max-w-44 truncate text-sm text-muted-foreground md:block">
                  {profile.full_name || profile.email}
                </p>
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
