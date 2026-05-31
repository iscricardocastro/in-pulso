import { z } from "zod";

export const debtPaymentSchema = z.object({
  debt_id: z.string().uuid(),
  payment_method_id: z.string().uuid("Metodo de pago requerido"),
  amount: z.coerce.number().positive("Monto requerido"),
  comments: z.string().trim().optional(),
});

export type DebtPaymentValues = z.infer<typeof debtPaymentSchema>;
