"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors, Resolver } from "react-hook-form";
import { toast } from "sonner";
import { customerSchema, type CustomerFormValues } from "@/features/customers/schemas";
import { getCustomerFormDefaults } from "@/features/customers/utils/customer-form";
import { lookupMexicoPostalCode } from "@/features/customers/utils/postal-code";
import { getFirstFieldErrorMessage } from "@/lib/form-errors";
import { upsertCustomer } from "@/services/customers";
import type { Customer } from "@/types/database";

export function useCustomerForm({
  customer,
  onSaved,
}: {
  customer?: Customer;
  onSaved?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as Resolver<CustomerFormValues>,
    defaultValues: getCustomerFormDefaults(customer),
  });

  async function inferAddressFromPostalCode(postalCode: string) {
    const inferred = await lookupMexicoPostalCode(postalCode);
    if (!inferred) return;
    form.setValue("country", inferred.country, { shouldDirty: true });
    form.setValue("state", inferred.state, { shouldDirty: true });
    if (inferred.city) form.setValue("city", inferred.city, { shouldDirty: true });
  }

  function submit(values: CustomerFormValues) {
    startTransition(async () => {
      try {
        await upsertCustomer(values);
        toast.success(customer ? "Cliente actualizado" : "Cliente creado");
        form.reset();
        onSaved?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    });
  }

  function invalid(errors: FieldErrors<CustomerFormValues>) {
    toast.error(getFirstFieldErrorMessage(errors));
  }

  return { form, inferAddressFromPostalCode, pending, submit, invalid };
}
