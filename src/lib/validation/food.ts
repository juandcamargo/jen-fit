import { z } from "zod"

export const manualFoodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(80).optional(),
  basis: z.enum(["per_100g", "per_serving"]),
  servingSizeG: z.number().positive().max(5000).optional(),
  calories: z.number().min(0).max(9000),
  protein: z.number().min(0).max(500),
  carbs: z.number().min(0).max(500),
  fat: z.number().min(0).max(500),
  fiber: z.number().min(0).max(200).optional(),
  sugar: z.number().min(0).max(500).optional(),
  sodiumMg: z.number().min(0).max(20000).optional(),
  isCollagen: z.boolean().optional(),
})

export const foodCorrectionSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  brand: z.string().trim().max(80).nullable().optional(),
  caloriesPer100g: z.number().min(0).max(9000).optional(),
  proteinPer100g: z.number().min(0).max(500).optional(),
  carbsPer100g: z.number().min(0).max(500).optional(),
  fatPer100g: z.number().min(0).max(500).optional(),
  fiberPer100g: z.number().min(0).max(200).nullable().optional(),
  sugarPer100g: z.number().min(0).max(500).nullable().optional(),
  sodiumPer100gMg: z.number().min(0).max(20000).nullable().optional(),
  isCollagen: z.boolean().optional(),
})
