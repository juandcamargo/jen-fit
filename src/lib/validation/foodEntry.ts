import { z } from "zod"

export const MEAL_TYPES = [
  "breakfast",
  "mid_morning",
  "lunch",
  "snack",
  "dinner",
  "snacks",
  "drinks",
  "supplements",
] as const

export const createFoodEntrySchema = z.object({
  foodItemId: z.string().optional(),
  recipeId: z.string().optional(),
  customName: z.string().optional(),
  mealType: z.enum(MEAL_TYPES),
  quantityG: z.number().positive().max(5000),
  weightState: z.enum(["raw", "cooked", "dry"]).default("raw"),
  date: z.string().optional(),
})

export const addRecipeIdeaSchema = z.object({
  ideaId: z.string(),
  mealType: z.enum(MEAL_TYPES),
  date: z.string().optional(),
})

export const saveRecipeIdeaSchema = z.object({
  ideaId: z.string(),
})
