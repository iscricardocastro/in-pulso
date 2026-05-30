"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProductForm } from "@/features/products/hooks/use-product-form";
import { createCatalogItem } from "@/services/catalogs";
import { createSupplier } from "@/services/suppliers";
import type { CatalogItem, CatalogKind, Product, Supplier } from "@/types/database";

type ProductFormProps = {
  product?: Product;
  suppliers: Supplier[];
  catalogs: CatalogItem[];
  onSaved?: () => void;
  onCancel?: () => void;
};

export function ProductForm({ product, suppliers, catalogs, onSaved, onCancel }: ProductFormProps) {
  const productForm = useProductForm({ product, catalogs, onSaved });
  const {
    form,
    pending,
    brand,
    brandId,
    model,
    modelId,
    category,
    categoryId,
    variant,
    variantId,
    primarySupplierId,
    brandItems,
    selectedBrand,
    modelItems,
    invalid,
    selectBrand,
    selectCategory,
    selectModel,
    selectVariant,
    setFieldValue,
    submit,
  } = productForm;

  return (
    <form className="grid gap-4 md:grid-cols-2" noValidate onSubmit={form.handleSubmit(submit, invalid)}>
      <input type="hidden" {...form.register("id")} />
      <input type="hidden" {...form.register("brand_id")} />
      <input type="hidden" {...form.register("model_id")} />
      <input type="hidden" {...form.register("category_id")} />
      <input type="hidden" {...form.register("variant_id")} />
      <Field error={form.formState.errors.name?.message} label="Nombre">
        <Input {...form.register("name")} />
      </Field>
      <Field label="Marca">
        <CatalogField
          catalogs={brandItems}
          kind="brand"
          placeholder="Buscar o agregar marca"
          selectedValue={brandId || ""}
          value={brand || ""}
          valueMode="id"
          onChange={(value) => setFieldValue("brand_id", value)}
          onSelect={selectBrand}
        />
      </Field>
      <Field label="Modelo">
        <CatalogField
          key={selectedBrand?.id ?? brand ?? "model-without-brand"}
          catalogs={modelItems}
          disabled={!brand?.trim()}
          kind="model"
          placeholder={brand?.trim() ? "Buscar o agregar modelo" : "Selecciona marca primero"}
          selectedValue={modelId || ""}
          value={model || ""}
          valueMode="id"
          onChange={(value) => setFieldValue("model_id", value)}
          onSelect={selectModel}
          onCreate={async (name) => {
            const parentBrand = selectedBrand ?? await createCatalogItem("brand", brand || "");
            selectBrand(parentBrand);
            return createCatalogItem("model", name, parentBrand.id);
          }}
        />
      </Field>
      <Field label="Categoria">
        <CatalogField
          catalogs={catalogs}
          kind="category"
          placeholder="Buscar o agregar categoria"
          selectedValue={categoryId || ""}
          value={category || ""}
          valueMode="id"
          onChange={(value) => setFieldValue("category_id", value)}
          onSelect={selectCategory}
        />
      </Field>
      <Field label="Variante">
        <CatalogField
          catalogs={catalogs}
          kind="variant"
          placeholder="Buscar o agregar variante"
          selectedValue={variantId || ""}
          value={variant || ""}
          valueMode="id"
          onChange={(value) => setFieldValue("variant_id", value)}
          onSelect={selectVariant}
        />
      </Field>
      <Field error={form.formState.errors.primary_supplier_id?.message} label="Proveedor principal">
        <SupplierField
          placeholder="Buscar o agregar proveedor"
          suppliers={suppliers}
          value={primarySupplierId || ""}
          onChange={(value) => setFieldValue("primary_supplier_id", value)}
        />
      </Field>
      <Field error={form.formState.errors.cost?.message} label="Costo">
        <Input step="0.01" type="number" {...form.register("cost")} />
      </Field>
      <Field error={form.formState.errors.sale_price?.message} label="Precio venta">
        <Input step="0.01" type="number" {...form.register("sale_price")} />
      </Field>
      <Field error={form.formState.errors.suggested_price?.message} label="Precio sugerido">
        <Input step="0.01" type="number" {...form.register("suggested_price")} />
      </Field>
      <Field error={form.formState.errors.current_stock?.message} label="Stock actual">
        <Input type="number" {...form.register("current_stock")} />
      </Field>
      <Field error={form.formState.errors.minimum_stock?.message} label="Stock minimo">
        <Input type="number" {...form.register("minimum_stock")} />
      </Field>
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
          {pending ? "Guardando..." : "Guardar producto"}
        </Button>
      </div>
    </form>
  );
}

function SupplierField({
  suppliers,
  value,
  placeholder,
  onChange,
}: {
  suppliers: Supplier[];
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const selected = suppliers.find((supplier) => supplier.id === value);

  return (
    <CreatableCombobox
      createSuccessMessage="Proveedor agregado"
      emptyLabel="Sin proveedores"
      options={suppliers}
      placeholder={placeholder}
      valueMode="id"
      selectedValue={value}
      value={selected?.name || ""}
      onChange={onChange}
      onCreate={(name) => createSupplier(name)}
      onSelect={(supplier) => onChange(supplier.id)}
    />
  );
}

function CatalogField({
  catalogs,
  kind,
  value,
  selectedValue,
  placeholder,
  disabled,
  valueMode,
  onChange,
  onSelect,
  onCreate,
}: {
  catalogs: CatalogItem[];
  kind: CatalogKind;
  value: string;
  selectedValue?: string;
  placeholder: string;
  disabled?: boolean;
  valueMode?: "name" | "id";
  onChange: (value: string) => void;
  onSelect?: (item: { id: string; name: string }) => void;
  onCreate?: (name: string) => Promise<CatalogItem>;
}) {
  return (
    <CreatableCombobox
      disabled={disabled}
      options={catalogs.filter((item) => item.kind === kind)}
      placeholder={placeholder}
      selectedValue={selectedValue}
      value={value}
      valueMode={valueMode}
      onChange={onChange}
      onSelect={onSelect}
      onCreate={onCreate ?? ((name) => createCatalogItem(kind, name))}
    />
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
