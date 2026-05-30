"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/features/auth/services/auth-client";

export function useSignOut() {
  const router = useRouter();

  async function handleClick() {
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cerrar sesion");
    }
  }

  return { handleClick };
}
