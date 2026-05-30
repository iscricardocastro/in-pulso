"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";

export function MainSearch() {
  const router = useRouter();
  const { query, setQuery } = useAppStore();

  return (
    <form
      className="relative w-full max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        router.push("/products");
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Buscar pieza, modelo o codigo"
        className="h-11 rounded-full border-border/80 bg-card/90 pl-10 shadow-sm shadow-slate-950/[0.03]"
        placeholder="Buscar pieza, modelo o codigo"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}
