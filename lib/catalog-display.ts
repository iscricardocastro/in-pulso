import type { Product } from "@/types/database";

export function productBrand(product: Product) {
  return product.brand_item?.name || product.brand || "";
}

export function productModel(product: Product | Pick<Product, "model" | "model_item">) {
  return product.model_item?.name || product.model || "";
}

export function productCategory(product: Product) {
  return product.category_item?.name || product.category || "";
}

export function productVariant(product: Product) {
  return product.variant_item?.name || product.variant || "";
}
