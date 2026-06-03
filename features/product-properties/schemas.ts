import { z } from "zod";

export const productPropertyTypes = ["text", "number", "date", "boolean", "option"] as const;

export const productPropertyDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  key: z
    .string()
    .trim()
    .min(1, "Clave requerida")
    .regex(/^[a-z][a-z0-9_]*$/, "Usa minusculas, numeros y guion bajo"),
  label: z.string().trim().min(1, "Etiqueta requerida"),
  type: z.enum(productPropertyTypes),
  required: z.coerce.boolean().default(false),
  searchable: z.coerce.boolean().default(true),
  filterable: z.coerce.boolean().default(true),
  display_order: z.coerce.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
});

export const productPropertyOptionSchema = z.object({
  definition_id: z.string().uuid(),
  value: z.string().trim().min(1, "Valor requerido"),
});

export type ProductPropertyDefinitionFormValues = z.infer<typeof productPropertyDefinitionSchema>;
