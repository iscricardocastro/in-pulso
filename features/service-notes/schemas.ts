import { z } from "zod";

const discountType = z.enum(["amount", "percent"]);

export const serviceTemplateFieldSchema = z.object({
  key: z.string().trim().min(1, "Clave requerida"),
  label: z.string().trim().min(1, "Etiqueta requerida"),
});

export const serviceTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Nombre requerido"),
  fields: z.array(serviceTemplateFieldSchema).min(1, "Agrega al menos un campo"),
});

export const serviceNoteItemInputSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  item_type: z.enum(["service", "part"]).default("service"),
  description: z.string().trim().min(1, "Descripcion requerida"),
  product_code: z.string().trim().nullable().optional(),
  quantity: z.coerce.number().int().positive("Cantidad requerida"),
  unit_price: z.coerce.number().min(0, "Precio invalido"),
});

export const serviceNotePaymentInputSchema = z.object({
  payment_method_id: z.string().uuid("Metodo de pago requerido"),
  amount_received: z.coerce.number().positive("Monto requerido"),
  comments: z.string().trim().optional(),
});

export const serviceNoteSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid("Cliente requerido"),
  template_id: z.string().uuid("Plantilla requerida"),
  device_fields: z.record(z.string(), z.string().trim()).default({}),
  discount_type: discountType.nullable().optional(),
  discount_value: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional(),
  items: z.array(serviceNoteItemInputSchema).min(1, "Agrega al menos un concepto"),
  payments: z.array(serviceNotePaymentInputSchema).default([]),
});

export const serviceNotePaymentSchema = z.object({
  service_note_id: z.string().uuid(),
  payment_method_id: z.string().uuid("Metodo de pago requerido"),
  amount_received: z.coerce.number().positive("Monto requerido"),
  comments: z.string().trim().optional(),
});

export const serviceNoteStatusSchema = z.object({
  service_note_id: z.string().uuid(),
  status: z.enum(["received", "in_progress", "ready", "delivered"]),
  note: z.string().trim().optional(),
});

export const cancelServiceNoteSchema = z.object({
  service_note_id: z.string().uuid(),
  note: z.string().trim().min(1, "Motivo requerido"),
});

export type ServiceTemplateValues = z.infer<typeof serviceTemplateSchema>;
export type ServiceNoteValues = z.infer<typeof serviceNoteSchema>;
export type ServiceNotePaymentValues = z.infer<typeof serviceNotePaymentSchema>;
export type ServiceNoteStatusValues = z.infer<typeof serviceNoteStatusSchema>;
