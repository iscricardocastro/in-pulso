import { z } from "zod";

export const profileSchema = z.object({
  full_name: z.string().trim().max(120, "Nombre demasiado largo").optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
