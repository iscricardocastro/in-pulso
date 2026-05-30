"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useMemo, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { FieldErrors, Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { productSchema, type ProductFormValues } from "@/features/products/schemas";
import { createCatalogItem } from "@/services/catalogs";
import { upsertProduct } from "@/services/products";
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
  const [pending, startTransition] = useTransition();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: product
      ? {
        id: product.id,
        brand_id: product.brand_id || "",
        model_id: product.model_id || "",
        category_id: product.category_id || "",
        variant_id: product.variant_id || "",
        name: product.name,
        brand: product.brand_item?.name || product.brand || "",
        model: product.model_item?.name || product.model || "",
        category: product.category_item?.name || product.category || "",
        variant: product.variant_item?.name || product.variant || "",
        cost: product.cost,
        sale_price: product.sale_price ?? "",
        suggested_price: product.suggested_price ?? "",
        current_stock: product.current_stock,
        minimum_stock: product.minimum_stock,
        primary_supplier_id: product.primary_supplier_id || "",
        notes: product.notes || "",
      }
      : {
        brand_id: "",
        model_id: "",
        category_id: "",
        variant_id: "",
        name: "",
        brand: "",
        model: "",
        category: "",
        variant: "",
        cost: 0,
        sale_price: "",
        suggested_price: "",
        current_stock: 0,
        minimum_stock: 1,
        primary_supplier_id: "",
        notes: "",
      },
  });
  const brand = useWatch({ control: form.control, name: "brand" });
  const brandId = useWatch({ control: form.control, name: "brand_id" });
  const model = useWatch({ control: form.control, name: "model" });
  const modelId = useWatch({ control: form.control, name: "model_id" });
  const category = useWatch({ control: form.control, name: "category" });
  const categoryId = useWatch({ control: form.control, name: "category_id" });
  const variant = useWatch({ control: form.control, name: "variant" });
  const variantId = useWatch({ control: form.control, name: "variant_id" });
  const primarySupplierId = useWatch({ control: form.control, name: "primary_supplier_id" });
  const brandItems = useMemo(() => catalogs.filter((item) => item.kind === "brand"), [catalogs]);
  const selectedBrand = useMemo(
    () => brandItems.find((item) => item.id === brandId) ?? brandItems.find((item) => item.name.toLowerCase() === (brand || "").trim().toLowerCase()),
    [brand, brandId, brandItems],
  );
  const modelItems = useMemo(
    () => (selectedBrand ? catalogs.filter((item) => item.kind === "model" && item.parent_id === selectedBrand.id) : []),
    [catalogs, selectedBrand],
  );

  function submit(values: ProductFormValues) {
    startTransition(async () => {
      try {
        await upsertProduct(values);
        toast.success(product ? "Producto actualizado" : "Producto creado");
        form.reset();
        onSaved?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    });
  }

  function invalid(errors: FieldErrors<ProductFormValues>) {
    const firstError = Object.values(errors)[0]?.message;
    toast.error(typeof firstError === "string" ? firstError : "Revisa los campos marcados");
  }

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
          onChange={(value) => form.setValue("brand_id", value, { shouldDirty: true, shouldValidate: true })}
          onSelect={(item) => {
            form.setValue("brand_id", item.id, { shouldDirty: true, shouldValidate: true });
            form.setValue("brand", item.name, { shouldDirty: true, shouldValidate: true });
            form.setValue("model_id", "", { shouldDirty: true, shouldValidate: true });
            form.setValue("model", "", { shouldDirty: true, shouldValidate: true });
          }}
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
          onChange={(value) => form.setValue("model_id", value, { shouldDirty: true, shouldValidate: true })}
          onSelect={(item) => {
            form.setValue("model_id", item.id, { shouldDirty: true, shouldValidate: true });
            form.setValue("model", item.name, { shouldDirty: true, shouldValidate: true });
          }}
          onCreate={async (name) => {
            const parentBrand = selectedBrand ?? await createCatalogItem("brand", brand || "");
            form.setValue("brand_id", parentBrand.id, { shouldDirty: true, shouldValidate: true });
            form.setValue("brand", parentBrand.name, { shouldDirty: true, shouldValidate: true });
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
          onChange={(value) => form.setValue("category_id", value, { shouldDirty: true, shouldValidate: true })}
          onSelect={(item) => {
            form.setValue("category_id", item.id, { shouldDirty: true, shouldValidate: true });
            form.setValue("category", item.name, { shouldDirty: true, shouldValidate: true });
          }}
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
          onChange={(value) => form.setValue("variant_id", value, { shouldDirty: true, shouldValidate: true })}
          onSelect={(item) => {
            form.setValue("variant_id", item.id, { shouldDirty: true, shouldValidate: true });
            form.setValue("variant", item.name, { shouldDirty: true, shouldValidate: true });
          }}
        />
      </Field>
      <Field error={form.formState.errors.primary_supplier_id?.message} label="Proveedor principal">
        <SupplierField
          placeholder="Buscar o agregar proveedor"
          suppliers={suppliers}
          value={primarySupplierId || ""}
          onChange={(value) => form.setValue("primary_supplier_id", value, { shouldDirty: true, shouldValidate: true })}
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
