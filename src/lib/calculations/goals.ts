/**
 * Calorie goal, deficit selection, and protein/macro targets (spec sections 8-10).
 */

export type DeficitPreference = "soft" | "moderate" | "custom"

export const DEFICIT_RANGES: Record<Exclude<DeficitPreference, "custom">, { min: number; max: number }> = {
  soft: { min: 150, max: 250 },
  moderate: { min: 250, max: 400 },
}

const CUSTOM_DEFICIT_MAX = 500
const HARD_CALORIE_FLOOR = 1200

export interface CalorieGoalResult {
  deficitKcal: number
  goalCalories: number
  wasAdjusted: boolean
  adjustmentMessage?: string
  estimatedWeeklyLossKg: number
}

export function calculateCalorieGoal({
  tdee,
  bmr,
  deficitPreference,
  customDeficitKcal,
}: {
  tdee: number
  bmr: number
  deficitPreference: DeficitPreference
  customDeficitKcal?: number | null
}): CalorieGoalResult {
  let deficitKcal: number
  if (deficitPreference === "soft") {
    deficitKcal = (DEFICIT_RANGES.soft.min + DEFICIT_RANGES.soft.max) / 2
  } else if (deficitPreference === "moderate") {
    deficitKcal = (DEFICIT_RANGES.moderate.min + DEFICIT_RANGES.moderate.max) / 2
  } else {
    deficitKcal = Math.min(Math.max(customDeficitKcal ?? 300, 0), CUSTOM_DEFICIT_MAX)
  }

  let goalCalories = tdee - deficitKcal
  // Never go below BMR (the body's minimum energy requirement at rest) nor
  // below a hard floor, to protect energy, recovery and muscle mass.
  const floor = Math.max(HARD_CALORIE_FLOOR, Math.round(bmr * 1.05))

  let wasAdjusted = false
  let adjustmentMessage: string | undefined
  if (goalCalories < floor) {
    goalCalories = floor
    deficitKcal = tdee - floor
    wasAdjusted = true
    adjustmentMessage =
      "Esta meta podría ser demasiado restrictiva. Ajustamos el déficit para priorizar tu energía, recuperación y masa muscular."
  }

  const estimatedWeeklyLossKg = Number(((deficitKcal * 7) / 7700).toFixed(2))

  return {
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
