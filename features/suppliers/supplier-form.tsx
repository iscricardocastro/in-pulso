"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors, Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supplierSchema, type SupplierFormValues } from "@/features/suppliers/schemas";
import { upsertSupplier } from "@/services/suppliers";
import type { Supplier } from "@/types/database";

export function SupplierForm({
  supplier,
  onSaved,
  onCancel,
}: {
  supplier?: Supplier;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as Resolver<SupplierFormValues>,
    defaultValues: supplier
      ? {
          id: supplier.id,
          name: supplier.name,
          contact: supplier.contact || "",
          phone: supplier.phone || "",
          email: supplier.email || "",
          country: supplier.country || "",
          average_delivery_days: supplier.average_delivery_days,
          payment_terms: supplier.payment_terms || "",
          notes: supplier.notes || "",
        }
      : {
          name: "",
          contact: "",
          phone: "",
          email: "",
          country: "",
          average_delivery_days: 0,
          payment_terms: "",
          notes: "",
        },
  });

  function submit(values: SupplierFormValues) {
    startTransition(async () => {
      try {
        await upsertSupplier(values);
        toast.success(supplier ? "Proveedor actualizado" : "Proveedor creado");
        form.reset();
        onSaved?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    });
  }

  function invalid(errors: FieldErrors<SupplierFormValues>) {
    const firstError = Object.values(errors)[0]?.message;
    toast.error(typeof firstError === "string" ? firstError : "Revisa los campos marcados");
  }

  return (
    <form className="grid gap-4 md:grid-cols-2" noValidate onSubmit={form.handleSubmit(submit, invalid)}>
      <input type="hidden" {...form.register("id")} />
      <Field label="Nombre" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </Field>
      <Field label="Contacto">
        <Input {...form.register("contact")} />
      </Field>
      <Field label="Telefono">
        <Input {...form.register("phone")} />
      </Field>
      <Field label="Correo" error={form.formState.errors.email?.message}>
        <Input type="email" {...form.register("email")} />
      </Field>
      <Field label="Pais">
        <Input {...form.register("country")} />
      </Field>
      <Field label="Tiempo promedio entrega (dias)" error={form.formState.errors.average_delivery_days?.message}>
        <Input min={0} type="number" {...form.register("average_delivery_days")} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Condiciones pago">
          <Input {...form.register("payment_terms")} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Notas">
          <Textarea {...form.register("notes")} />
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-2 md:col-span-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button disabled={pending} type="button" variant="secondary" onClick={onCancel}>
            Cerrar
          </Button>
        ) : null}
        <Button disabled={pending} type="submit">
          <Save className="h-4 w-4" />
          {pending ? "Guardando..." : "Guardar proveedor"}
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
