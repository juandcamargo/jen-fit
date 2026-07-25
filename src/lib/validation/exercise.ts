import { z } from "zod"

export const MUSCLE_GROUPS = [
  "legs",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "core",
  "full_body",
] as const

export const createStrengthWorkoutSchema = z.object({
  date: z.string().optional(),
  name: z.string().optional(),
  muscleGroups: z.array(z.enum(MUSCLE_GROUPS)).min(1),
  durationMin: z.number().int().positive().max(400),
  avgRestSec: z.number().int().min(0).max(600).optional(),
  routineType: z.enum(["traditional", "circuit", "full_body"]).default("traditional"),
  rpe: z.number().int().min(1).max(10).optional(),
  effortLabel: z.enum(["very_light", "light", "moderate", "high", "very_high"]).optional(),
  sets: z
    .array(
      z.object({
        exerciseName: z.string().min(1),
        muscleGroup: z.enum(MUSCLE_GROUPS),
        setNumber: z.number().int().positive(),
        reps: z.number().int().positive(),
        weightKg: z.number().min(0).optional(),
      })
    )
    .default([]),
})

export const CARDIO_TYPES = [
  "walk",
  "incline_walk",
  "run",
  "bike",
  "elliptical",
  "stairmaster",
  "row",
  "swim",
  "dance",
  "class",
  "hiit",
  "other",
] as const

export const createCardioSchema = z.object({
  date: z.string().optional(),
  type: z.enum(CARDIO_TYPES),
  minutes: z.number().int().positive().max(600),
  effort: z.enum(["light", "moderate", "high", "very_high"]),
  rpe: z.number().int().min(1).max(10).optional(),
  distanceKm: z.number().min(0).optional(),
  speedKmh: z.number().min(0).optional(),
  inclinePercent: z.number().min(0).max(30).optional(),
  avgHeartRate: z.number().int().min(0).max(240).optional(),
})
