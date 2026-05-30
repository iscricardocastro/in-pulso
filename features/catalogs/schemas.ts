import { z } from "zod";

export const catalogKinds = ["brand", "model", "category", "variant", "payment_method"] as const;

export const catalogItemSchema = z.object({
  id: z.string().uuid().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  kind: z.enum(catalogKinds),
  name: z.string().trim().min(1, "Nombre requerido"),
});

export type CatalogItemFormValues = z.infer<typeof catalogItemSchema>;
