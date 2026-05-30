"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPasswordForm } from "@/features/auth/hooks/use-reset-password-form";

export function ResetPasswordForm() {
  const { loading, handleSubmit } = useResetPasswordForm();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Recuperar contrasena</CardTitle>
        <CardDescription>Enviaremos instrucciones al correo registrado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={handleSubmit}
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
