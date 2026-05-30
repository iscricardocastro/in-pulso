import type { ProductFormValues } from "@/features/products/schemas";
import type { Product } from "@/types/database";

export function getProductFormDefaults(product?: Product): ProductFormValues {
  if (!product) {
    return {
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
    };
  }

  return {
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
  };
}
