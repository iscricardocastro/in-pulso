"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMovementForm } from "@/features/movements/hooks/use-movement-form";
import type { Product } from "@/types/database";

export function MovementForm({
  products,
  onSaved,
  onCancel,
}: {
  products: Product[];
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { form, pending, productId, setProductId, submit, invalid } = useMovementForm({ products, onSaved });

  return (
    <form className="grid gap-4 md:grid-cols-4" noValidate onSubmit={form.handleSubmit(submit, invalid)}>
      <div className="space-y-2 md:col-span-2">
        <Label>Producto</Label>
        <ProductField
          products={products}
          value={productId || ""}
          onChange={setProductId}
        />
        {form.formState.errors.product_id?.message ? (
          <p className="text-sm text-destructive">{form.formState.errors.product_id.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select {...form.register("type")}>
          <option value="entry">Entrada</option>
          <option value="exit">Salida</option>
          <option value="adjustment">Ajuste manual</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Cantidad</Label>
        <Input min={1} type="number" {...form.register("quantity")} />
        {form.formState.errors.quantity?.message ? (
          <p className="text-sm text-destructive">{form.formState.errors.quantity.message}</p>
        ) : null}
      </div>
      <div className="space-y-2 md:col-span-4">
        <Label>Comentario</Label>
        <Textarea {...form.register("comment")} />
      </div>
      <div className="flex flex-col-reverse gap-2 md:col-span-4 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button disabled={pending} type="button" variant="secondary" onClick={onCancel}>
            Cerrar
          </Button>
        ) : null}
        <Button disabled={pending || products.length === 0} type="submit">
          <Save className="h-4 w-4" />
          {pending ? "Guardando..." : "Registrar movimiento"}
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
  );
}
