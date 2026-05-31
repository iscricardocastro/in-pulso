import type { CustomerFormValues } from "@/features/customers/schemas";
import type { Customer } from "@/types/database";

export function getCustomerFormDefaults(customer?: Customer): CustomerFormValues {
  if (!customer) {
    return {
      name: "",
      address: "",
      postal_code: "",
      city: "",
      country: "",
      state: "",
      phone: "",
      email: "",
    };
  }

  return {
    id: customer.id,
    name: customer.name,
    address: customer.address || "",
    postal_code: customer.postal_code || "",
    city: customer.city || "",
    country: customer.country || "",
    state: customer.state || "",
    phone: customer.phone || "",
    email: customer.email || "",
  };
}
