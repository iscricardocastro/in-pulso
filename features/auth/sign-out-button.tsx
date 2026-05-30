"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/features/auth/hooks/use-sign-out";

export function SignOutButton() {
  const { handleClick } = useSignOut();

  return (
    <Button
      aria-label="Cerrar sesion"
      size="icon"
      type="button"
      variant="ghost"
      onClick={handleClick}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
