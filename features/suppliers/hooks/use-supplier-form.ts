"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors, Resolver } from "react-hook-form";
import { toast } from "sonner";
import { supplierSchema, type SupplierFormValues } from "@/features/suppliers/schemas";
import { getSupplierFormDefaults } from "@/features/suppliers/utils/supplier-form";
import { getFirstFieldErrorMessage } from "@/lib/form-errors";
import { upsertSupplier } from "@/services/suppliers";
import type { Supplier } from "@/types/database";

export function useSupplierForm({
  supplier,
  onSaved,
}: {
  supplier?: Supplier;
  onSaved?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as Resolver<SupplierFormValues>,
    defaultValues: getSupplierFormDefaults(supplier),
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
    toast.error(getFirstFieldErrorMessage(errors));
  }

  return { form, pending, submit, invalid };
}
