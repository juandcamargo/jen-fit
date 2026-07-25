import { z } from "zod"

export const createRecipeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  servings: z.number().int().min(1).max(50).default(1),
  notes: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        foodItemId: z.string(),
        quantityG: z.number().positive().max(5000),
        weightState: z.enum(["raw", "cooked", "dry"]).default("raw"),
      })
    )
    .min(1, "Agrega al menos un ingrediente"),
})
