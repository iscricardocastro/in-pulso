"use client";

import { Building2, KeyRound, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/features/auth/services/auth-client";
import { updateMyProfile } from "@/services/profile";
import type { UserProfile } from "@/types/database";

type ProfileCompany = {
  id: string;
  name: string;
  slug: string;
};

export function ProfileView({ company, profile }: { company: ProfileCompany; profile: UserProfile }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [profilePending, startProfileTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();

  function saveProfile() {
    startProfileTransition(async () => {
      try {
        await updateMyProfile({ full_name: fullName });
        toast.success("Perfil actualizado");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo actualizar el perfil");
      }
    });
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirm-password") ?? "");

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmation) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    startPasswordTransition(async () => {
      try {
        await updatePassword(password);
        formElement.reset();
        toast.success("Contraseña actualizada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo cambiar la contraseña");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mi perfil</h1>
          <p className="text-sm text-muted-foreground">Datos de acceso y usuario dentro de {company.name}.</p>
        </div>
        <Badge className="w-fit gap-1.5" variant="secondary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {roleLabel(profile.role)}
        </Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Informacion personal
            </CardTitle>
            <CardDescription>Nombre visible en ventas, reportes y movimientos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                description="Puedes dejarlo vacio para mostrar el correo."
                label="Nombre"
                htmlFor="full_name"
              >
                <Input
                  autoComplete="name"
                  id="full_name"
                  maxLength={120}
                  placeholder="Nombre completo"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </Field>
              <Field
                description="El correo viene de Auth y no se cambia aqui."
                label="Correo"
                htmlFor="email"
              >
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-readonly="true"
                    className="pl-9"
                    id="email"
                    readOnly
                    type="email"
                    value={profile.email}
                  />
                </div>
              </Field>
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/35 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button disabled={profilePending} type="button" onClick={saveProfile}>
                  <Save className="h-4 w-4" />
                  {profilePending ? "Guardando..." : "Guardar perfil"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Compañia
            </CardTitle>
            <CardDescription>Tenant asignado a tu usuario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow label="Nombre" value={company.name} />
            <InfoRow label="Slug" value={company.slug} />
            <InfoRow label="Rol" value={roleLabel(profile.role)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Cambiar contraseña
          </CardTitle>
          <CardDescription>Usa minimo 8 caracteres. El cambio aplica al acceso de Pulso.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={savePassword}>
            <Field label="Nueva contraseña" htmlFor="password">
              <Input
                autoComplete="new-password"
                id="password"
                minLength={8}
                name="password"
                placeholder="Minimo 8 caracteres"
                required
                type="password"
              />
            </Field>
            <Field label="Confirmar contraseña" htmlFor="confirm-password">
              <Input
                autoComplete="new-password"
                id="confirm-password"
                minLength={8}
                name="confirm-password"
                placeholder="Repite contraseña"
                required
                type="password"
              />
            </Field>
            <Button disabled={passwordPending} type="submit">
              <KeyRound className="h-4 w-4" />
              {passwordPending ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  children,
  description,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  description?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/35 px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    manager: "Manager",
    operator: "Operador",
  };

  return labels[role] ?? role;
}
