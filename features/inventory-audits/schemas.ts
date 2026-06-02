import { z } from "zod";

export const createInventoryAuditSchema = z.object({
  category_ids: z.array(z.string().uuid()).min(1, "Selecciona al menos una categoria"),
  notes: z.string().trim().optional(),
});

export const countInventoryAuditItemSchema = z.object({
  audit_id: z.string().uuid(),
  item_id: z.string().uuid(),
  mode: z.enum(["add", "set"]),
  quantity: z.coerce.number().int().min(0, "Cantidad invalida"),
});

export const closeInventoryAuditSchema = z.object({
  audit_id: z.string().uuid(),
  apply_inventory: z.boolean().default(true),
  uncounted_policy: z.enum(["ignore", "zero"]).default("ignore"),
});

export const cancelInventoryAuditSchema = z.object({
  audit_id: z.string().uuid(),
});

export type CreateInventoryAuditValues = z.infer<typeof createInventoryAuditSchema>;
export type CountInventoryAuditItemValues = z.infer<typeof countInventoryAuditItemSchema>;
export type CloseInventoryAuditValues = z.infer<typeof closeInventoryAuditSchema>;
export type CancelInventoryAuditValues = z.infer<typeof cancelInventoryAuditSchema>;
