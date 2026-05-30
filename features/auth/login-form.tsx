"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Entrar a Pulso</CardTitle>
        <CardDescription>Usa tu correo y contrasena de InMexico.</CardDescription>
        {search.get("error") === "missing-profile" ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Tu usuario existe en Auth, pero no tiene perfil/tenant en `public.users`.
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            const form = new FormData(event.currentTarget);
            const supabase = createSupabaseBrowserClient();
            const { error } = await supabase.auth.signInWithPassword({
              email: String(form.get("email")),
              password: String(form.get("password")),
            });
            setLoading(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Sesion iniciada");
            router.push("/dashboard");
            router.refresh();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" required type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input id="password" name="password" required type="password" />
          </div>
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
          <Link className="block text-center text-sm text-primary hover:underline" href="/reset-password">
            Recuperar contrasena
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
