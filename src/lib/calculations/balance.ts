/**
 * Daily energy balance (spec sections 19-21).
 *
 * gasto_ejercicio = gasto_fuerza + gasto_cardio + otras_actividades
 * gasto_esperado  = gasto_base_sin_ejercicio + gasto_ejercicio
 * balance_energético = consumo_esperado - gasto_esperado   (negative = deficit)
 * diferencia_meta    = consumo_esperado - meta_calórica
 *
 * "consumo_esperado" projects the full day's intake — if it's still early in
 * the day, callers should pass the *projected* total (e.g. today's logged
 * calories, or logged + a same-day-average fallback), never a partial sum
 * compared against a full-day expenditure. This module doesn't guess that
 * projection; it only combines already-decided numbers.
 */
export interface DailyBalanceInput {
  baseExpenditure: number // BMR * NEAT-only activity factor
  strengthCalories: number
  cardioCalories: number
  otherActivityCalories?: number
  expectedIntake: number // today's full-day calories (consumed so far, or projected)
  calorieGoal: number
}

export interface DailyBalanceResult {
  exerciseCalories: number
  expectedExpenditure: number
  deficitOrSurplus: number // negative = deficit, positive = surplus vs expenditure
  diffFromGoal: number // negative = under goal, positive = over goal
  isDeficit: boolean
}

export function calculateDailyBalance({
  baseExpenditure,
  strengthCalories,
  cardioCalories,
  otherActivityCalories = 0,
  expectedIntake,
  calorieGoal,
}: DailyBalanceInput): DailyBalanceResult {
  const exerciseCalories = strengthCalories + cardioCalories + otherActivityCalories
  const expectedExpenditure = baseExpenditure + exerciseCalories
  const deficitOrSurplus = Math.round(expectedIntake - expectedExpenditure)
  const diffFromGoal = Math.round(expectedIntake - calorieGoal)

  return {
    exerciseCalories: Math.round(exerciseCalories),
    expectedExpenditure: Math.round(expectedExpenditure),
    deficitOrSurplus,
    diffFromGoal,
    isDeficit: deficitOrSurplus < 0,
  }
}

/**
 * Weekly rollup (spec section 23) — the number the app should foreground,
 * so a single over-goal day never reads as "failure".
 */
export function summarizeWeeklyBalance(
  days: { deficitOrSurplus: number; proteinConsumed: number; proteinGoal: number; waterConsumedMl: number; waterGoalMl: number }[]
) {
  const daysWithData = days.length || 1
  const totalDeficit = days.reduce((sum, d) => sum + d.deficitOrSurplus, 0)
  const avgDailyDeficit = Math.round(totalDeficit / daysWithData)

  const daysInDeficit = days.filter((d) => d.deficitOrSurplus < -50).length
  const daysNearMaintenance = days.filter((d) => Math.abs(d.deficitOrSurplus) <= 50).length
  const daysInSurplus = days.filter((d) => d.deficitOrSurplus > 50).length

  const avgProteinPercent =
    days.length === 0
      ? 0
      : Math.round(
          (days.reduce((sum, d) => sum + (d.proteinGoal ? d.proteinConsumed / d.proteinGoal : 0), 0) /
            daysWithData) *
            100
        )

  const avgWaterPercent =
    days.length === 0
      ? 0
      : Math.round(
          (days.reduce((sum, d) => sum + (d.waterGoalMl ? d.waterConsumedMl / d.waterGoalMl : 0), 0) /
            daysWithData) *
            100
        )

  return {
    totalWeeklyDeficit: totalDeficit,
    avgDailyDeficit,
    daysInDeficit,
    daysNearMaintenance,
    daysInSurplus,
    avgProteinPercent,
    avgWaterPercent,
  }
}
