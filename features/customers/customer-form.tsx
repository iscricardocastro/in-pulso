"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerForm } from "@/features/customers/hooks/use-customer-form";
import type { Customer } from "@/types/database";

export function CustomerForm({
  customer,
  onSaved,
  onCancel,
}: {
  customer?: Customer;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { form, inferAddressFromPostalCode, pending, submit, invalid } = useCustomerForm({ customer, onSaved });

  return (
    <form className="grid gap-4 md:grid-cols-2" noValidate onSubmit={form.handleSubmit(submit, invalid)}>
      <input type="hidden" {...form.register("id")} />
      <Field label="Nombre" error={form.formState.errors.name?.message}>
        <Input autoComplete="organization" {...form.register("name")} />
      </Field>
      <Field label="Telefono">
        <Input autoComplete="tel" {...form.register("phone")} />
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input autoComplete="email" type="email" {...form.register("email")} />
      </Field>
      <Field label="Codigo postal">
        <Input
          autoComplete="postal-code"
          inputMode="numeric"
          {...form.register("postal_code", {
            onBlur: (event) => inferAddressFromPostalCode(event.target.value),
          })}
        />
      </Field>
      <Field label="Direccion">
        <Input autoComplete="street-address" {...form.register("address")} />
      </Field>
      <Field label="Ciudad">
        <Input autoComplete="address-level2" {...form.register("city")} />
      </Field>
      <Field label="Estado">
        <Input autoComplete="address-level1" {...form.register("state")} />
      </Field>
      <Field label="Pais">
        <Input autoComplete="country-name" {...form.register("country")} />
      </Field>
      <div className="flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button disabled={pending} type="button" variant="secondary" onClick={onCancel}>
            Cerrar
          </Button>
        ) : null}
        <Button disabled={pending} type="submit">
          <Save className="h-4 w-4" />
          {pending ? "Guardando..." : "Guardar cliente"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
