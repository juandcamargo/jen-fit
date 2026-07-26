/**
 * Calorie goal, deficit selection, and protein/fat/carb targets.
 *
 * The calorie deficit is treated as the app's primary metric: it's always
 * expressed as a percentage of TDEE (not a fixed kcal amount), so it scales
 * correctly for any body size. For someone wanting to lose weight at a
 * "moderate" pace, that percentage is 17% of TDEE.
 */

export type Pace = "gradual" | "moderate" | "faster"
export type DeficitPreference = "soft" | "moderate" | "custom"

export const DEFICIT_PERCENT_BY_PACE: Record<Pace, number> = {
  gradual: 0.12,
  moderate: 0.17,
  faster: 0.22,
}

const MIN_DEFICIT_PERCENT = 0.08
const MAX_DEFICIT_PERCENT = 0.3
const HARD_CALORIE_FLOOR = 1200

export interface CalorieGoalResult {
  deficitPercent: number
  deficitKcal: number
  goalCalories: number
  wasAdjusted: boolean
  adjustmentMessage?: string
  estimatedWeeklyLossKg: number
}

/**
 * `deficitPreference` maps onto a deficit percentage: "soft" -> gradual pace
 * (~12%), "moderate" -> 17% (the default for weight/fat loss), "custom" ->
 * `customDeficitPercent` (clamped to a safe 8-30% range).
 */
export function calculateCalorieGoal({
  tdee,
  bmr,
  deficitPreference,
  pace = "moderate",
  customDeficitPercent,
}: {
  tdee: number
  bmr: number
  deficitPreference: DeficitPreference
  pace?: Pace
  customDeficitPercent?: number | null
}): CalorieGoalResult {
  let deficitPercent: number
  if (deficitPreference === "soft") {
    deficitPercent = DEFICIT_PERCENT_BY_PACE.gradual
  } else if (deficitPreference === "moderate") {
    deficitPercent = DEFICIT_PERCENT_BY_PACE[pace] ?? DEFICIT_PERCENT_BY_PACE.moderate
  } else {
    deficitPercent = Math.min(Math.max(customDeficitPercent ?? DEFICIT_PERCENT_BY_PACE.moderate, MIN_DEFICIT_PERCENT), MAX_DEFICIT_PERCENT)
  }

  let deficitKcal = tdee * deficitPercent
  let goalCalories = tdee - deficitKcal

  // Never go below BMR (the body's minimum energy requirement at rest) nor
  // below a hard floor, to protect energy, recovery and muscle mass.
  const floor = Math.max(HARD_CALORIE_FLOOR, Math.round(bmr * 1.05))

  let wasAdjusted = false
  let adjustmentMessage: string | undefined
  if (goalCalories < floor) {
    goalCalories = floor
    deficitKcal = tdee - floor
    deficitPercent = tdee > 0 ? deficitKcal / tdee : deficitPercent
    wasAdjusted = true
    adjustmentMessage =
      "Esta meta podría ser demasiado restrictiva. Ajustamos el déficit para priorizar tu energía, recuperación y masa muscular."
  }

  const estimatedWeeklyLossKg = Number(((deficitKcal * 7) / 7700).toFixed(2))

  return {
    deficitPercent: Number(deficitPercent.toFixed(3)),
    deficitKcal: Math.round(deficitKcal),
    goalCalories: Math.round(goalCalories),
    wasAdjusted,
    adjustmentMessage,
    estimatedWeeklyLossKg,
  }
}

export interface ProteinGoalResult {
  proteinGoalG: number
  factorUsed: number
}

/**
 * Protein target: weightKg * factor, factor configurable within 1.6–2.2 g/kg.
 */
export function calculateProteinGoal({
  weightKg,
  proteinFactor = 1.8,
}: {
  weightKg: number
  proteinFactor?: number
}): ProteinGoalResult {
  const factor = Math.min(Math.max(proteinFactor, 1.6), 2.2)
  return {
    proteinGoalG: Math.round(weightKg * factor),
    factorUsed: factor,
  }
}

export interface MacroGoalResult {
  fatGoalG: number
  carbsGoalG: number
  fatRatio: number
}

/**
 * Splits the calorie goal into fat and carbohydrate targets once protein is
 * already accounted for. Fat defaults to ~30% of total calories (a
 * reasonable default for hormonal health), and carbs take the remainder.
 */
export function calculateMacroGoals({
  goalCalories,
  proteinGoalG,
  fatRatio = 0.3,
}: {
  goalCalories: number
  proteinGoalG: number
  fatRatio?: number
}): MacroGoalResult {
  const fatGoalG = Math.round((goalCalories * fatRatio) / 9)
  const proteinCalories = proteinGoalG * 4
  const fatCalories = fatGoalG * 9
  const carbsGoalG = Math.max(0, Math.round((goalCalories - proteinCalories - fatCalories) / 4))

  return { fatGoalG, carbsGoalG, fatRatio }
}

/**
 * Splits a total protein figure into "complete" protein (meat, eggs, dairy,
 * legumes, whey/plant protein, ...) and collagen. Collagen still counts
 * toward calories and total protein, but never toward the "complete
 * protein" target — collagen is an incomplete protein source.
 */
export function splitProteinSources({
  totalProteinG,
  collagenProteinG,
}: {
  totalProteinG: number
  collagenProteinG: number
}): { totalProteinG: number; completeProteinG: number; collagenProteinG: number } {
  const collagen = Math.min(collagenProteinG, totalProteinG)
  return {
    totalProteinG: Number(totalProteinG.toFixed(1)),
    completeProteinG: Number((totalProteinG - collagen).toFixed(1)),
    collagenProteinG: Number(collagen.toFixed(1)),
  }
}
