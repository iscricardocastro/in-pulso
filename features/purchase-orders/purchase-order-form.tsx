"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { FieldErrors, Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { purchaseOrderSchema, type PurchaseOrderFormValues } from "@/features/purchase-orders/schemas";
import { money } from "@/lib/utils";
import { createPurchaseOrder } from "@/services/purchase-orders";
import type { Product, Supplier } from "@/types/database";

export function PurchaseOrderForm({
  products,
  suppliers,
  initialValues,
  onSaved,
  onCancel,
}: {
  products: Product[];
  suppliers: Supplier[];
  initialValues?: PurchaseOrderFormValues;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const emptyValues: PurchaseOrderFormValues = {
    supplier_id: "",
    status: "draft",
    expected_arrival: "",
    advance_percent: 0,
    advance_paid: 0,
    notes: "",
    expected_items: [{ product_id: "", quantity_requested: 1, unit_cost: 0 }],
  };
  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema) as Resolver<PurchaseOrderFormValues>,
    defaultValues: initialValues ?? emptyValues,
  });
  const items = useFieldArray({ control: form.control, name: "expected_items" });
  const supplierId = useWatch({ control: form.control, name: "supplier_id" });
  const watchedItems = useWatch({ control: form.control, name: "expected_items" });
  const estimatedTotal = (watchedItems ?? []).reduce(
    (total, item) => total + Number(item.quantity_requested || 0) * Number(item.unit_cost || 0),
    0,
  );

  useEffect(() => {
    const supplier = suppliers.find((entry) => entry.id === supplierId);
    if (!supplier) {
      form.setValue("expected_arrival", "", { shouldDirty: true, shouldValidate: true });
      return;
    }
    const nextArrival = format(addDays(new Date(), supplier.average_delivery_days), "yyyy-MM-dd");
    form.setValue("expected_arrival", nextArrival, { shouldDirty: true, shouldValidate: true });
  }, [form, supplierId, suppliers]);

  function submit(values: PurchaseOrderFormValues) {
    startTransition(async () => {
      try {
        await createPurchaseOrder(values);
        toast.success("Pedido creado");
        form.reset(emptyValues);
        onSaved?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo crear pedido");
      }
    });
  }

  function invalid(errors: FieldErrors<PurchaseOrderFormValues>) {
    const firstError = Object.values(errors)[0]?.message;
    toast.error(typeof firstError === "string" ? firstError : "Revisa los campos marcados");
  }

  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(submit, invalid)}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Proveedor</Label>
          <Select {...form.register("supplier_id")}>
            <option value="">Selecciona proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Fecha esperada llegada</Label>
          <Input type="date" {...form.register("expected_arrival")} />
        </div>
        <div className="space-y-2">
          <Label>Anticipo (%)</Label>
          <Input min={0} max={100} type="number" {...form.register("advance_percent")} />
        </div>
        <div className="space-y-2">
          <Label>Anticipo pagado</Label>
          <Input min={0} step="0.01" type="number" {...form.register("advance_paid")} />
        </div>
        <div className="space-y-2">
          <Label>Total estimado</Label>
          <Input disabled value={money(estimatedTotal)} />
        </div>
        <div className="space-y-2">
          <Label>Estado inicial</Label>
          <Select {...form.register("status")}>
            <option value="draft">Draft</option>
            <option value="quoted">Cotizado</option>
            <option value="partially_paid">Pagado parcial</option>
            <option value="paid">Pagado completo</option>
            <option value="in_transit">En transito</option>
          </Select>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Productos esperados</Label>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => items.append({ product_id: "", quantity_requested: 1, unit_cost: 0 })}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>
        {items.fields.map((field, index) => (
          <div
            key={field.id}
            className="animate-slide-panel grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 md:grid-cols-[1fr_130px_150px_44px] md:items-end"
          >
            <ProductField
              products={products}
              value={watchedItems?.[index]?.product_id || ""}
              onChange={(productId) => {
                form.setValue(`expected_items.${index}.product_id`, productId, { shouldDirty: true, shouldValidate: true });
                form.setValue(`expected_items.${index}.unit_cost`, products.find((product) => product.id === productId)?.cost ?? 0, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input min={1} type="number" {...form.register(`expected_items.${index}.quantity_requested`)} />
            </div>
            <div className="space-y-2">
              <Label>Costo unitario</Label>
              <Input min={0} step="0.01" type="number" {...form.register(`expected_items.${index}.unit_cost`)} />
            </div>
            <Button size="icon" type="button" variant="ghost" onClick={() => items.remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Textarea {...form.register("notes")} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button disabled={pending} type="button" variant="secondary" onClick={onCancel}>
            Cerrar
          </Button>
        ) : null}
        <Button disabled={pending || products.length === 0 || suppliers.length === 0} type="submit">
          <Save className="h-4 w-4" />
          {pending ? "Creando..." : "Crear pedido"}
        </Button>
      </div>
    </form>
  );
}

function ProductField({
  products,
  value,
  onChange,
}: {
  products: Product[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = products.find((product) => product.id === value);

  return (
    <div className="space-y-2">
      <Label>Producto</Label>
      <CreatableCombobox
        emptyLabel="Sin productos"
        options={products.map((product) => ({ id: product.id, name: `${product.internal_code} · ${product.name}` }))}
        placeholder="Buscar producto"
        selectedValue={value}
        value={selected ? `${selected.internal_code} · ${selected.name}` : ""}
        valueMode="id"
        onChange={onChange}
        onSelect={(product) => onChange(product.id)}
      />
    </div>
  );
}
