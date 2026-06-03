import type { Product } from "@/types/database";

export function productBrand(product: Product) {
  return productPropertyValue(product, "brand") || product.brand_item?.name || product.brand || "";
}

export function productModel(product: Product | Pick<Product, "model" | "model_item">) {
  if ("properties" in product) return productPropertyValue(product as Product, "model") || product.model_item?.name || product.model || "";
  return product.model_item?.name || product.model || "";
}

export function productCategory(product: Product) {
  return productPropertyValue(product, "category") || product.category_item?.name || product.category || "";
}

export function productVariant(product: Product) {
  return productPropertyValue(product, "variant") || product.variant_item?.name || product.variant || "";
}

export function productPropertyValue(product: Product, key: string) {
  const value = product.properties?.[key];
  if (value === null || value === undefined) return "";
  return String(value);
}
