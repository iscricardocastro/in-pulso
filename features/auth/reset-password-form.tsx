"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Recuperar contrasena</CardTitle>
        <CardDescription>Enviaremos instrucciones al correo registrado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            const form = new FormData(event.currentTarget);
            const { error } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(
              String(form.get("email")),
              { redirectTo: `${window.location.origin}/login` },
            );
            setLoading(false);
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success("Correo enviado");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" required type="email" />
          </div>
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Enviando..." : "Enviar enlace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
