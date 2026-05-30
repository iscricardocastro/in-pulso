import { z } from "zod";

export const movementSchema = z.object({
  product_id: z.string().uuid("Selecciona producto"),
  type: z.enum(["entry", "exit", "adjustment"]),
  quantity: z.coerce.number().int().positive("Cantidad requerida"),
  comment: z.string().optional(),
});

export type MovementFormValues = z.infer<typeof movementSchema>;
