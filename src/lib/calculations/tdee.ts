/**
 * TDEE estimation.
 *
 * Two different activity-factor blends are exposed on purpose:
 *
 * - `estimateOnboardingActivityFactor` blends daily steps AND training
 *   frequency. It is only used once, during onboarding, to show an
 *   *initial* TDEE estimate before any real logging exists (spec section 7).
 *
 * - `estimateNeatActivityFactor` blends daily steps only (no training
 *   score). It is used for the day-to-day "base expenditure" figure that
 *   DailySummary stores, because logged strength/cardio sessions are added
 *   on top explicitly (spec sections 19-20). Blending training frequency
 *   into *both* numbers would double count exercise energy.
 *
 * Activity level ranges (spec section 7):
 *   sedentary:    1.20–1.30
 *   light:        1.30–1.40
 *   moderate:     1.40–1.55
 *   very_active:  1.55–1.70
 */

export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active"

export const ACTIVITY_FACTOR_RANGES: Record<ActivityLevel, { low: number; high: number }> = {
  sedentary: { low: 1.2, high: 1.3 },
  light: { low: 1.3, high: 1.4 },
  moderate: { low: 1.4, high: 1.55 },
  very_active: { low: 1.55, high: 1.7 },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function stepsScore(avgDailySteps?: number | null): number {
  const steps = avgDailySteps ?? 5000
  return clamp((steps - 2000) / (12000 - 2000), 0, 1)
}

function trainingScore(trainingDaysPerWeek?: number | null): number {
  const days = trainingDaysPerWeek ?? 0
  return clamp(days / 6, 0, 1)
}

export function estimateOnboardingActivityFactor({
  activityLevel,
  avgDailySteps,
  trainingDaysPerWeek,
}: {
  activityLevel: ActivityLevel
  avgDailySteps?: number | null
  trainingDaysPerWeek?: number | null
}): number {
  const range = ACTIVITY_FACTOR_RANGES[activityLevel]
  const blended = stepsScore(avgDailySteps) * 0.6 + trainingScore(trainingDaysPerWeek) * 0.4
  return Number((range.low + (range.high - range.low) * blended).toFixed(2))
}

export function estimateNeatActivityFactor({
  activityLevel,
  avgDailySteps,
}: {
  activityLevel: ActivityLevel
  avgDailySteps?: number | null
}): number {
  const range = ACTIVITY_FACTOR_RANGES[activityLevel]
  const blended = stepsScore(avgDailySteps)
  return Number((range.low + (range.high - range.low) * blended).toFixed(2))
}

export interface TdeeEstimate {
  bmr: number
  tdeeLow: number
  tdeeMid: number
  tdeeHigh: number
  activityFactor: number
  confidence: "low" | "medium" | "high"
}

export function estimateTdee({
  bmr,
  activityLevel,
  avgDailySteps,
  trainingDaysPerWeek,
}: {
  bmr: number
  activityLevel: ActivityLevel
  avgDailySteps?: number | null
  trainingDaysPerWeek?: number | null
}): TdeeEstimate {
  const range = ACTIVITY_FACTOR_RANGES[activityLevel]
  const activityFactor = estimateOnboardingActivityFactor({
    activityLevel,
    avgDailySteps,
    trainingDaysPerWeek,
  })

  return {
    bmr: Math.round(bmr),
    tdeeLow: Math.round(bmr * range.low),
    tdeeMid: Math.round(bmr * activityFactor),
    tdeeHigh: Math.round(bmr * range.high),
    activityFactor,
    confidence: "low", // upgraded to medium/high once calibrateTdee runs (21+ days of data)
  }
}

/**
 * Calibrate TDEE using real logged data (spec section 33).
 * Uses 7-day moving averages of intake and weight change, limits any single
 * adjustment to ~100 kcal, and requires at least 21 days of usable history.
 */
export function calibrateTdee({
  currentTdee,
  avgDailyIntake7d,
  weightChangeKgPer7d,
  daysOfData,
}: {
  currentTdee: number
  avgDailyIntake7d: number
  weightChangeKgPer7d: number
  daysOfData: number
}): { calibratedTdee: number; confidence: "low" | "medium" | "high"; applied: boolean } {
  if (daysOfData < 21) {
    return { calibratedTdee: currentTdee, confidence: "low", applied: false }
  }

  // 7700 kcal ≈ 1 kg of fat tissue.
  const impliedDailyBalance = (weightChangeKgPer7d * 7700) / 7
  const impliedTdee = avgDailyIntake7d - impliedDailyBalance

  const rawDelta = impliedTdee - currentTdee
  const cappedDelta = clamp(rawDelta, -100, 100)
  const calibratedTdee = Math.round(currentTdee + cappedDelta)

  const confidence: "low" | "medium" | "high" =
    daysOfData >= 60 ? "high" : daysOfData >= 35 ? "medium" : "low"

  return { calibratedTdee, confidence, applied: true }
}
