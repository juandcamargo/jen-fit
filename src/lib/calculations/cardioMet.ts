/**
 * Estimated active-calorie expenditure for cardio (spec section 18).
 * Same base formula as strength: calories = (MET - 1) * 3.5 * weightKg / 200 * minutes
 */
export type CardioType =
  | "walk"
  | "incline_walk"
  | "run"
  | "bike"
  | "elliptical"
  | "stairmaster"
  | "row"
  | "swim"
  | "dance"
  | "class"
  | "hiit"
  | "other"

export type CardioEffort = "light" | "moderate" | "high" | "very_high"

// [light, moderate, high, very_high]
const MET_TABLE: Record<CardioType, [number, number, number, number]> = {
  walk: [2.8, 3.5, 4.5, 5.0],
  incline_walk: [4.0, 5.0, 6.5, 8.0],
  run: [6.0, 8.3, 10.0, 12.5],
  bike: [4.0, 6.8, 8.5, 10.5],
  elliptical: [4.6, 5.5, 7.0, 9.0],
  stairmaster: [4.0, 6.0, 8.0, 9.8],
  row: [4.8, 7.0, 8.5, 12.0],
  swim: [5.0, 7.0, 9.5, 11.0],
  dance: [3.5, 4.8, 6.0, 7.3],
  class: [4.0, 6.0, 7.5, 9.0],
  hiit: [6.5, 8.0, 9.0, 10.5], // already an average across work + rest intervals
  other: [3.5, 5.0, 6.5, 8.0],
}

const EFFORT_INDEX: Record<CardioEffort, number> = {
  light: 0,
  moderate: 1,
  high: 2,
  very_high: 3,
}

function inclineAdjustment(type: CardioType, inclinePercent?: number | null): number {
  if (inclinePercent == null || inclinePercent <= 0) return 0
  if (type !== "walk" && type !== "incline_walk" && type !== "stairmaster") return 0
  return Math.min(2.5, inclinePercent * 0.08)
}

/** Light-touch nudge from heart rate, when available, against an assumed max HR of 190. */
function heartRateAdjustment(effort: CardioEffort, avgHeartRate?: number | null): number {
  if (avgHeartRate == null) return 0
  const assumedMaxHr = 190
  const pctMax = avgHeartRate / assumedMaxHr
  const expected = { light: 0.6, moderate: 0.72, high: 0.85, very_high: 0.93 }[effort]
  const delta = pctMax - expected
  return Number((delta * 2).toFixed(2)) // small nudge, capped implicitly by clamp downstream
}

export function estimateCardioMet({
  type,
  effort,
  inclinePercent,
  avgHeartRate,
}: {
  type: CardioType
  effort: CardioEffort
  inclinePercent?: number | null
  avgHeartRate?: number | null
}): number {
  const base = MET_TABLE[type][EFFORT_INDEX[effort]]
  const met =
    base + inclineAdjustment(type, inclinePercent) + heartRateAdjustment(effort, avgHeartRate)
  return Number(Math.min(14, Math.max(2, met)).toFixed(2))
}

export function estimateCardioCalories({
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
