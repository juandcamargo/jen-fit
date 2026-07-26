import { estimateCardioMet, estimateCardioCalories } from "./calculations"

/**
 * Daily deficit projection + suggestions (spec: dashboard "estimado" section).
 *
 * `projectedIntake` is deliberately conservative: if she's already under her
 * goal, we project she lands ON her goal (her own stated target — not an
 * invented number); if she's already over it, we can't un-eat food, so we
 * project today's actual consumption as final. Either way we never invent
 * meals she hasn't eaten.
 */
export interface DailyProjectionInput {
  caloriesConsumedSoFar: number
  calorieGoal: number
  baseExpenditure: number // full-day NEAT, doesn't change through the day
  exerciseCaloriesSoFar: number // whatever's logged so far today
  targetDeficitKcal: number // from calculateCalorieGoal — the % of TDEE she's aiming for
  weightKg: number
}

export interface DailyProjectionResult {
  projectedIntake: number
  projectedBurn: number
  projectedBalance: number // negative = deficit
  gapToTargetKcal: number // positive = still needs to close this much to hit her target deficit
  onTrack: boolean
}

export function projectDailyBalance(input: DailyProjectionInput): DailyProjectionResult {
  const projectedIntake = Math.max(input.caloriesConsumedSoFar, input.calorieGoal)
  const projectedBurn = input.baseExpenditure + input.exerciseCaloriesSoFar
  const projectedBalance = projectedIntake - projectedBurn

  // Target deficit is negative (e.g. -300 means "300 kcal under expenditure").
  const targetBalance = -input.targetDeficitKcal
  const gapToTargetKcal = Math.max(0, Math.round(projectedBalance - targetBalance))

  return {
    projectedIntake: Math.round(projectedIntake),
    projectedBurn: Math.round(projectedBurn),
    projectedBalance: Math.round(projectedBalance),
    gapToTargetKcal,
    onTrack: gapToTargetKcal === 0,
  }
}

export interface Suggestion {
  type: "walk" | "hiit" | "food"
  label: string
  detail: string
}

/**
 * Turns a calorie gap into concrete, non-punitive options — movement OR
 * food, never framed as "you must burn what you ate" (spec section 28).
 */
export function suggestWaysToCloseGap({
  gapKcal,
  weightKg,
}: {
  gapKcal: number
  weightKg: number
}): Suggestion[] {
  if (gapKcal <= 0) return []

  const walkMet = estimateCardioMet({ type: "walk", effort: "moderate" })
  const walkCalPerMin = estimateCardioCalories({ weightKg, minutes: 1, met: walkMet })
  const walkMinutes = Math.ceil(gapKcal / Math.max(1, walkCalPerMin) / 5) * 5

  const hiitMet = estimateCardioMet({ type: "hiit", effort: "high" })
  const hiitCalPerMin = estimateCardioCalories({ weightKg, minutes: 1, met: hiitMet })
  const hiitMinutes = Math.ceil(gapKcal / Math.max(1, hiitCalPerMin) / 5) * 5

  return [
    {
      type: "walk",
      label: `Una caminata de ~${walkMinutes} min`,
      detail: `A paso moderado, cerraría los ${gapKcal} kcal que faltan.`,
    },
    {
      type: "hiit",
      label: `O ~${hiitMinutes} min de cardio intenso / HIIT`,
      detail: "Una opción más corta si tienes poco tiempo.",
    },
    {
      type: "food",
      label: `También puedes ajustar tu próxima comida en ~${gapKcal} kcal`,
      detail: "Mantén la proteína — prioriza reducir aceites, salsas o carbohidratos.",
    },
  ]
}
