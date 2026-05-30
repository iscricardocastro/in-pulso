import { z } from "zod";

export const purchaseOrderItemSchema = z.object({
  product_id: z.string().uuid("Producto requerido"),
  quantity_requested: z.coerce.number().int().positive(),
  unit_cost: z.coerce.number().min(0),
  received_quantity: z.coerce.number().int().min(0).optional(),
});

export const purchaseOrderSchema = z.object({
  id: z.string().uuid().optional(),
  supplier_id: z.string().uuid("Proveedor requerido"),
  status: z.enum(["draft", "quoted", "partially_paid", "paid", "in_transit", "received"]),
  expected_arrival: z.string().min(1, "Fecha requerida"),
  advance_percent: z.coerce.number().min(0).max(100),
  advance_paid: z.coerce.number().min(0),
  notes: z.string().optional(),
  expected_items: z.array(purchaseOrderItemSchema).min(1, "Agrega al menos un producto"),
});

export const receiveOrderSchema = z.object({
  order_id: z.string().uuid(),
  close_order: z.boolean().optional(),
  reception_note: z.string().trim().optional(),
  received_items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity_requested: z.coerce.number().int().positive(),
      unit_cost: z.coerce.number().min(0),
      received_quantity: z.coerce.number().int().min(0),
    }),
  ),
});

export const purchaseOrderPaymentSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.coerce.number().positive("Monto requerido"),
  payment_method_id: z.string().uuid("Metodo de pago requerido"),
  note: z.string().trim().optional(),
});

export const purchaseOrderTransitSchema = z.object({
  order_id: z.string().uuid(),
  note: z.string().trim().optional(),
});

export const purchaseOrderCancelSchema = z.object({
  order_id: z.string().uuid(),
  note: z.string().trim().optional(),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
export type ReceiveOrderValues = z.infer<typeof receiveOrderSchema>;
export type PurchaseOrderPaymentValues = z.infer<typeof purchaseOrderPaymentSchema>;
export type PurchaseOrderTransitValues = z.infer<typeof purchaseOrderTransitSchema>;
