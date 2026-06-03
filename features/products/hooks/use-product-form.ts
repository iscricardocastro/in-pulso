"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { FieldErrors, Resolver } from "react-hook-form";
import { toast } from "sonner";
import { productSchema, type ProductFormValues } from "@/features/products/schemas";
import { getProductFormDefaults } from "@/features/products/utils/product-form";
import { getFirstFieldErrorMessage } from "@/lib/form-errors";
import { upsertProduct } from "@/services/products";
import type { CatalogItem, Product, ProductPropertyDefinition, ProductPropertyOption } from "@/types/database";

export function useProductForm({
  product,
  catalogs,
  propertyDefinitions,
  propertyOptions,
  onSaved,
}: {
  product?: Product;
  catalogs: CatalogItem[];
  propertyDefinitions: ProductPropertyDefinition[];
  propertyOptions: ProductPropertyOption[];
  onSaved?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as Resolver<ProductFormValues>,
    defaultValues: getProductFormDefaults(product),
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
  const properties = useWatch({ control: form.control, name: "properties" }) ?? {};
  const brandItems = catalogs.filter((item) => item.kind === "brand");
  const selectedBrand = brandItems.find((item) => item.id === brandId) ?? brandItems.find((item) => item.name.toLowerCase() === (brand || "").trim().toLowerCase());
  const modelItems = selectedBrand ? catalogs.filter((item) => item.kind === "model" && item.parent_id === selectedBrand.id) : [];

  function setCatalogField(idKey: "brand_id" | "model_id" | "category_id" | "variant_id", nameKey: "brand" | "model" | "category" | "variant", id: string, name: string) {
    form.setValue(idKey, id, { shouldDirty: true, shouldValidate: true });
    form.setValue(nameKey, name, { shouldDirty: true, shouldValidate: true });
  }

  function selectBrand(item: { id: string; name: string }) {
    setCatalogField("brand_id", "brand", item.id, item.name);
    setCatalogField("model_id", "model", "", "");
  }

  function selectModel(item: { id: string; name: string }) {
    setCatalogField("model_id", "model", item.id, item.name);
  }

  function selectCategory(item: { id: string; name: string }) {
    setCatalogField("category_id", "category", item.id, item.name);
  }

  function selectVariant(item: { id: string; name: string }) {
    setCatalogField("variant_id", "variant", item.id, item.name);
  }

  function setFieldValue(key: "brand_id" | "model_id" | "category_id" | "variant_id" | "primary_supplier_id", value: string) {
    form.setValue(key, value, { shouldDirty: true, shouldValidate: true });
  }

  function setPropertyValue(key: string, value: unknown) {
    form.setValue("properties", { ...properties, [key]: value }, { shouldDirty: true, shouldValidate: true });
  }

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
    toast.error(getFirstFieldErrorMessage(errors));
  }

  return {
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
    properties,
    propertyDefinitions,
    propertyOptions,
    brandItems,
    selectedBrand,
    modelItems,
    invalid,
    selectBrand,
    selectCategory,
    selectModel,
    selectVariant,
    setFieldValue,
    setPropertyValue,
    submit,
  };
}
