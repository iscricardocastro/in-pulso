import { z } from "zod";

const discountType = z.enum(["amount", "percent"]);
const discountSchema = z.object({
  type: discountType.nullable().optional(),
  value: z.coerce.number().min(0).default(0),
});

export const saleItemInputSchema = z.object({
  product_id: z.string().uuid("Producto requerido"),
  quantity: z.coerce.number().int().positive("Cantidad requerida"),
  unit_price: z.coerce.number().min(0, "Precio invalido"),
  suggested_price: z.coerce.number().min(0, "Precio sugerido invalido"),
  discount: discountSchema.optional(),
});

export const createSaleSchema = z.object({
  customer_id: z.string().uuid().or(z.literal("")).optional(),
  comments: z.string().trim().optional(),
  allow_debt: z.boolean().optional(),
  discount: discountSchema.optional(),
  items: z.array(saleItemInputSchema).min(1, "Agrega al menos un producto"),
  payments: z.array(
    z.object({
      payment_method_id: z.string().uuid("Metodo de pago requerido"),
      amount_received: z.coerce.number().positive("Monto requerido"),
      comments: z.string().trim().optional(),
    }),
  ).default([]),
});

export const updateSaleSchema = createSaleSchema.extend({
  sale_id: z.string().uuid(),
  note: z.string().trim().min(1, "Motivo requerido"),
});

export const cancelSaleSchema = z.object({
  sale_id: z.string().uuid(),
  note: z.string().trim().min(1, "Motivo requerido"),
});

export const refundSaleSchema = z.object({
  sale_id: z.string().uuid(),
  payment_method_id: z.string().uuid("Metodo de pago requerido"),
  amount: z.coerce.number().min(0, "Monto invalido"),
  affect_inventory: z.boolean().default(true),
  comments: z.string().trim().optional(),
  items: z.array(
    z.object({
      sale_item_id: z.string().uuid(),
      quantity: z.coerce.number().int().min(0),
    }),
  ).min(1, "Selecciona al menos una pieza"),
});

export type CreateSaleValues = z.infer<typeof createSaleSchema>;
export type UpdateSaleValues = z.infer<typeof updateSaleSchema>;
export type CancelSaleValues = z.infer<typeof cancelSaleSchema>;
export type RefundSaleValues = z.infer<typeof refundSaleSchema>;
