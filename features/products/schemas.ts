import { z } from "zod";

const optionalUuid = z
  .string()
  .uuid("Identificador invalido")
  .or(z.literal(""))
  .optional();
const optionalPrice = z
  .literal("")
  .or(z.coerce.number().min(0, "Precio invalido"))
  .optional();

export const productSchema = z.object({
  id: optionalUuid,
  name: z.string().min(2, "Nombre requerido"),
  brand_id: optionalUuid,
  model_id: optionalUuid,
  category_id: optionalUuid,
  variant_id: optionalUuid,
  brand: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  variant: z.string().optional(),
  cost: z.coerce.number().min(0, "Costo invalido"),
  sale_price: optionalPrice,
  suggested_price: optionalPrice,
  current_stock: z.coerce.number().int().min(0, "Stock invalido"),
  minimum_stock: z.coerce.number().int().min(0, "Minimo invalido"),
  primary_supplier_id: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
