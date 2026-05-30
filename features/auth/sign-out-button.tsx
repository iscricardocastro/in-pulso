"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      aria-label="Cerrar sesion"
      size="icon"
      type="button"
      variant="ghost"
      onClick={async () => {
        await createSupabaseBrowserClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
