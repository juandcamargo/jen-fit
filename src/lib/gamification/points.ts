/**
 * Fit Points rules (spec section 25). Rewards consistency and healthy
 * behavior — never rewards eating as little as possible or an excessive
 * deficit. Recomputed idempotently from a day's data (see dailySummary.ts),
 * so calling this twice for the same day is always safe.
 */
export interface DailyPointsInput {
  hasBreakfastEntry: boolean
  hasAllMainMeals: boolean // breakfast + lunch + dinner all logged
  proteinConsumed: number
  proteinGoal: number
  waterConsumedMl: number
  waterGoalMl: number
  completedWorkout: boolean
  loggedWeight: boolean
  tookSupplements: boolean
  caloriesConsumed: number
  caloriesGoal: number
  deficitOrSurplus: number // negative = deficit
}

export interface DailyPointsResult {
  totalPoints: number
  breakdown: { reason: string; points: number }[]
}

const UNSAFE_MIN_CALORIES = 800

export function evaluateDailyPoints(input: DailyPointsInput): DailyPointsResult {
  const breakdown: { reason: string; points: number }[] = []
  const isUnsafeUndereating = input.caloriesConsumed > 0 && input.caloriesConsumed < UNSAFE_MIN_CALORIES

  if (input.hasBreakfastEntry) breakdown.push({ reason: "Registraste el desayuno", points: 5 })
  if (input.hasAllMainMeals) breakdown.push({ reason: "Registraste todas tus comidas", points: 10 })

  if (!isUnsafeUndereating && input.proteinGoal > 0 && input.proteinConsumed >= input.proteinGoal) {
    breakdown.push({ reason: "Cumpliste tu meta de proteína", points: 15 })
  }

  if (input.waterGoalMl > 0 && input.waterConsumedMl >= input.waterGoalMl) {
    breakdown.push({ reason: "Cumpliste tu meta de agua", points: 10 })
  }

  if (input.completedWorkout) breakdown.push({ reason: "Completaste un entrenamiento", points: 15 })
  if (input.loggedWeight) breakdown.push({ reason: "Registraste tu peso", points: 5 })
  if (input.tookSupplements) breakdown.push({ reason: "Registraste tus suplementos", points: 5 })

  // A "healthy" deficit range only — never reward surplus, never reward an
  // excessive/unsafe deficit, and never reward drastic under-eating.
  const isHealthyDeficit = input.deficitOrSurplus <= -50 && input.deficitOrSurplus >= -600
  if (!isUnsafeUndereating && isHealthyDeficit) {
    breakdown.push({ reason: "Mantuviste un déficit saludable", points: 10 })
  }

  const totalPoints = breakdown.reduce((sum, b) => sum + b.points, 0)
  return { totalPoints, breakdown }
}
