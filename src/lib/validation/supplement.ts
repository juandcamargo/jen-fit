import { z } from "zod"

export const SUPPLEMENT_PRESETS = [
  "collagen",
  "creatine",
  "protein_powder",
  "multivitamin",
  "omega3",
  "magnesium",
  "other",
] as const

export const createSupplementSchema = z.object({
  preset: z.enum(SUPPLEMENT_PRESETS),
  name: z.string().trim().min(1).max(80),
  dose: z.number().positive().max(500),
  unit: z.string().default("g"),
  recommendedTime: z.string().optional(),
  frequency: z.string().default("daily"),
  brand: z.string().optional(),
  notes: z.string().optional(),
  calories: z.number().min(0).max(500).default(0),
  proteinG: z.number().min(0).max(100).default(0),
  fatG: z.number().min(0).max(100).default(0),
  carbsG: z.number().min(0).max(100).default(0),
})

export const logSupplementSchema = z.object({
  supplementId: z.string(),
  date: z.string().optional(),
  taken: z.boolean().default(true),
})
