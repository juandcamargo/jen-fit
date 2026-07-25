/**
 * Estimated active-calorie expenditure for strength training (spec section 17).
 *
 * calories = (MET - 1) * 3.5 * weightKg / 200 * minutes
 *
 * MET ranges:
 *   soft strength:        3.0–3.8
 *   moderate strength:    3.8–5.0
 *   intense strength:     5.0–6.0
 *   intense circuit:      6.0–8.0
 */
export type MuscleGroup =
  | "legs"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves"
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "full_body"

export type EffortLabel = "very_light" | "light" | "moderate" | "high" | "very_high"
export type RoutineType = "traditional" | "circuit" | "full_body"

function effortFromRpe(rpe: number): EffortLabel {
  if (rpe <= 3) return "light"
  if (rpe <= 6) return "moderate"
  if (rpe <= 8) return "high"
  return "very_high"
}

function baseMetForEffort(effort: EffortLabel, routineType: RoutineType): number {
  if (routineType === "circuit" && (effort === "high" || effort === "very_high")) {
    return 7.0 // intense circuit: 6.0–8.0
  }
  switch (effort) {
    case "very_light":
    case "light":
      return 3.4 // soft strength: 3.0–3.8
    case "moderate":
      return 4.4 // moderate strength: 3.8–5.0
    case "high":
      return 5.5 // intense strength: 5.0–6.0
    case "very_high":
      return 5.8
  }
}

function muscleGroupAdjustment(groups: MuscleGroup[]): number {
  if (groups.includes("full_body") || groups.includes("legs")) return 0.3
  if (groups.includes("glutes") || groups.includes("hamstrings")) return 0.2
  const isolatedArms =
    groups.length > 0 && groups.every((g) => g === "biceps" || g === "triceps")
  if (isolatedArms) return -0.3
  return 0 // torso: chest / back / shoulders / core
}

function restAdjustment(avgRestSec?: number | null): number {
  if (avgRestSec == null) return 0
  if (avgRestSec < 45) return 0.3
  if (avgRestSec <= 90) return 0
  return -0.2
}

export function estimateStrengthMet({
  effortLabel,
  rpe,
  routineType,
  muscleGroups,
  avgRestSec,
}: {
  effortLabel?: EffortLabel | null
  rpe?: number | null
  routineType: RoutineType
  muscleGroups: MuscleGroup[]
  avgRestSec?: number | null
}): number {
  const effort = effortLabel ?? (rpe != null ? effortFromRpe(rpe) : "moderate")
  const base = baseMetForEffort(effort, routineType)
  const met = base + muscleGroupAdjustment(muscleGroups) + restAdjustment(avgRestSec)
  return Number(Math.min(9, Math.max(2.5, met)).toFixed(2))
}

export function estimateStrengthCalories({
  weightKg,
  minutes,
  met,
}: {
  weightKg: number
  minutes: number
  met: number
}): number {
  const calories = ((met - 1) * 3.5 * weightKg) / 200 * minutes
  return Math.round(Math.max(0, calories))
}
