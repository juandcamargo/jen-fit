import { z } from "zod"

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  targetWeightKg: z.number().min(30).max(300).optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "very_active"]).optional(),
  avgDailySteps: z.number().min(0).max(50000).optional(),
  trainingDaysPerWeek: z.number().min(0).max(7).optional(),
  proteinFactor: z.number().min(1.6).max(2.2).optional(),
  waterGoalMl: z.number().min(1000).max(5000).optional(),
  deficitPreference: z.enum(["soft", "moderate", "custom"]).optional(),
  customDeficitKcal: z.number().min(0).max(500).optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
})
