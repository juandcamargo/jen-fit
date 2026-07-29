import { z } from "zod"

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  heightCm: z.number().min(120).max(230).optional(),
  birthDate: z.string().optional(),
  targetBodyFatPercent: z.number().min(8).max(50).optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "very_active"]).optional(),
  avgDailySteps: z.number().min(0).max(50000).optional(),
  trainingDaysPerWeek: z.number().min(0).max(7).optional(),
  proteinFactor: z.number().min(1.6).max(2.2).optional(),
  waterGoalMl: z.number().min(1000).max(5000).optional(),
  pace: z.enum(["gradual", "moderate", "faster"]).optional(),
  deficitPreference: z.enum(["soft", "moderate", "custom"]).optional(),
  customDeficitPercent: z.number().min(0.08).max(0.3).optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
})
