/**
 * Macro <-> calorie consistency (spec section 10 / 38).
 * calories = protein_g*4 + carbs_g*4 + fat_g*9 (fiber is informational, not
 * separately weighted here since it's already included in carbs_g upstream).
 */
export function caloriesFromMacros({
  proteinG,
  carbsG,
  fatG,
}: {
  proteinG: number
  carbsG: number
  fatG: number
}): number {
  return proteinG * 4 + carbsG * 4 + fatG * 9
}

export interface MacroConsistencyResult {
  declaredCalories: number
  derivedCalories: number
  differenceKcal: number
  isConsistent: boolean
}

/**
 * Compares calories declared by a source (label / API) against calories
 * derived from its macros, with a tolerance to absorb rounding on packaging.
 */
export function checkMacroConsistency({
  declaredCalories,
  proteinG,
  carbsG,
  fatG,
  toleranceRatio = 0.1,
  toleranceAbsoluteKcal = 20,
}: {
  declaredCalories: number
  proteinG: number
  carbsG: number
  fatG: number
  toleranceRatio?: number
  toleranceAbsoluteKcal?: number
}): MacroConsistencyResult {
  const derivedCalories = caloriesFromMacros({ proteinG, carbsG, fatG })
  const differenceKcal = Math.abs(declaredCalories - derivedCalories)
  const tolerance = Math.max(toleranceAbsoluteKcal, declaredCalories * toleranceRatio)

  return {
    declaredCalories: Math.round(declaredCalories),
    derivedCalories: Math.round(derivedCalories),
    differenceKcal: Math.round(differenceKcal),
    isConsistent: differenceKcal <= tolerance,
  }
}
