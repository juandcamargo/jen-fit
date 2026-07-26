import { z } from "zod"

export const onboardingSchema = z.object({
  birthDate: z.string().min(1, "Indica tu fecha de nacimiento"),
  heightCm: z.number().min(120).max(230),
  currentWeightKg: z.number().min(30).max(300),

  // Navy method measurements — used to estimate body-fat % (the tracked goal
  // metric, not weight).
  waistCm: z.number().min(40).max(200),
  hipCm: z.number().min(40).max(200),
  neckCm: z.number().min(20).max(60),
  targetBodyFatPercent: z.number().min(8).max(50),

  mainGoal: z.enum(["lose_weight", "reduce_fat", "improve_habits", "maintain_muscle", "more_energy"]),

  activityLevel: z.enum(["sedentary", "light", "moderate", "very_active"]),
  avgDailySteps: z.number().min(0).max(50000).optional(),

  trainingDaysPerWeek: z.number().min(0).max(7),
  trainingTypes: z.array(z.string()).default([]),

  pace: z.enum(["gradual", "moderate", "faster"]),

  proteinFactor: z.number().min(1.6).max(2.2).default(1.8),
  waterGoalMl: z.number().min(1000).max(5000),
})

export type OnboardingInput = z.infer<typeof onboardingSchema>
