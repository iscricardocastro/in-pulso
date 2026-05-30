import type { SupplierFormValues } from "@/features/suppliers/schemas";
import type { Supplier } from "@/types/database";

export function getSupplierFormDefaults(supplier?: Supplier): SupplierFormValues {
  if (!supplier) {
    return {
      name: "",
      contact: "",
      phone: "",
      email: "",
      country: "",
      average_delivery_days: 0,
      payment_terms: "",
      notes: "",
    };
  }

  return {
    id: supplier.id,
    name: supplier.name,
    contact: supplier.contact || "",
    phone: supplier.phone || "",
    email: supplier.email || "",
    country: supplier.country || "",
    average_delivery_days: supplier.average_delivery_days,
    payment_terms: supplier.payment_terms || "",
    notes: supplier.notes || "",
  };
}
