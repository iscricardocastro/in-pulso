"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { FieldErrors, Resolver } from "react-hook-form";
import { toast } from "sonner";
import { purchaseOrderSchema, type PurchaseOrderFormValues } from "@/features/purchase-orders/schemas";
import {
  calculateEstimatedTotal,
  emptyPurchaseOrderValues,
  getExpectedArrival,
  getProductCost,
} from "@/features/purchase-orders/utils/purchase-order-form";
import { getFirstFieldErrorMessage } from "@/lib/form-errors";
import { createPurchaseOrder } from "@/services/purchase-orders";
import type { Product, Supplier } from "@/types/database";

export function usePurchaseOrderForm({
  products,
  suppliers,
  initialValues,
  onSaved,
}: {
  products: Product[];
  suppliers: Supplier[];
  initialValues?: PurchaseOrderFormValues;
  onSaved?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema) as Resolver<PurchaseOrderFormValues>,
    defaultValues: initialValues ?? emptyPurchaseOrderValues,
  });
  const items = useFieldArray({ control: form.control, name: "expected_items" });
  const supplierId = useWatch({ control: form.control, name: "supplier_id" });
  const watchedItems = useWatch({ control: form.control, name: "expected_items" });
  const estimatedTotal = calculateEstimatedTotal(watchedItems);

  useEffect(() => {
    const supplier = suppliers.find((entry) => entry.id === supplierId);
    form.setValue("expected_arrival", getExpectedArrival(supplier), { shouldDirty: true, shouldValidate: true });
  }, [form, supplierId, suppliers]);

  function addItem() {
    items.append({ product_id: "", quantity_requested: 1, unit_cost: 0 });
  }

  function removeItem(index: number) {
    items.remove(index);
  }

  function selectProduct(index: number, productId: string) {
    form.setValue(`expected_items.${index}.product_id`, productId, { shouldDirty: true, shouldValidate: true });
    form.setValue(`expected_items.${index}.unit_cost`, getProductCost(products, productId), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function submit(values: PurchaseOrderFormValues) {
    startTransition(async () => {
      try {
        await createPurchaseOrder(values);
        toast.success("Pedido creado");
        form.reset(emptyPurchaseOrderValues);
        onSaved?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear pedido");
      }
    });
  }

  function invalid(errors: FieldErrors<PurchaseOrderFormValues>) {
    toast.error(getFirstFieldErrorMessage(errors));
  }

  return { form, items, watchedItems, estimatedTotal, pending, addItem, removeItem, selectProduct, submit, invalid };
}
