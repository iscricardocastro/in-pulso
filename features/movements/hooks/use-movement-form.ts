"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { FieldErrors, Resolver } from "react-hook-form";
import { toast } from "sonner";
import { movementSchema, type MovementFormValues } from "@/features/movements/schemas";
import { getFirstFieldErrorMessage } from "@/lib/form-errors";
import { recordMovement } from "@/services/movements";
import type { Product } from "@/types/database";

export function useMovementForm({ products, onSaved }: { products: Product[]; onSaved?: () => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema) as Resolver<MovementFormValues>,
    defaultValues: {
      product_id: products[0]?.id || "",
      type: "entry",
      quantity: 1,
      comment: "",
    },
  });
  const productId = useWatch({ control: form.control, name: "product_id" });

  function setProductId(value: string) {
    form.setValue("product_id", value, { shouldDirty: true, shouldValidate: true });
  }

  function submit(values: MovementFormValues) {
    startTransition(async () => {
      try {
        await recordMovement(values);
        toast.success("Movimiento registrado");
        form.reset({ ...values, quantity: 1, comment: "" });
        onSaved?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo registrar");
      }
    });
  }

  function invalid(errors: FieldErrors<MovementFormValues>) {
    toast.error(getFirstFieldErrorMessage(errors));
  }

  return { form, pending, productId, setProductId, submit, invalid };
}
