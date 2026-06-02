import { z } from "zod";

export const companySettingsSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido"),
  slug: z.string().trim().min(1, "Slug requerido"),
  legal_name: z.string().optional(),
  tax_id: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Correo invalido").optional().or(z.literal("")),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  image_url: z.string().url("Imagen invalida").optional().or(z.literal("")),
  image_path: z.string().optional(),
});

export type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;
