import { z } from "zod";

export const supplierSchema = z.object({
  id: z.string().uuid("Identificador invalido").or(z.literal("")).optional(),
  name: z.string().min(2, "Nombre requerido"),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo invalido").optional().or(z.literal("")),
  country: z.string().optional(),
  average_delivery_days: z.coerce.number().int().min(0, "Dias invalidos"),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
