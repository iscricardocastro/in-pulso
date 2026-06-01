import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function MainSearch() {
  return (
    <form
      action="/products"
      className="relative w-full max-w-2xl"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Buscar pieza, modelo o codigo"
        className="h-11 rounded-full border-border/80 bg-card/90 pl-10 shadow-sm shadow-slate-950/[0.03]"
        name="q"
        placeholder="Buscar pieza, modelo o codigo"
      />
    </form>
  );
}
