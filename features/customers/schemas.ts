import { z } from "zod";

export const customerSchema = z.object({
  id: z.string().uuid("Identificador invalido").or(z.literal("")).optional(),
  name: z.string().trim().min(1, "Nombre requerido"),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo invalido").optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
