import { BrandLogo } from "@/components/brand-logo";

export function PortalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="flex items-center gap-2">
          <BrandLogo className="h-8 w-8 rounded-lg bg-card ring-1 ring-border/70" imageClassName="h-6 w-6" />
          <span className="font-semibold text-foreground">Pulso</span>
          <span>de InMexico</span>
        </div>
        <p>© {year} InMexico. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
