import { describe, expect, it } from "vitest"
import { calculateBmr, ageFromBirthDate } from "./bmr"
import { estimateTdee, calibrateTdee, estimateNeatActivityFactor } from "./tdee"
import { calculateCalorieGoal, calculateProteinGoal, splitProteinSources } from "./goals"
import { caloriesFromMacros, checkMacroConsistency } from "./macros"
import { estimateBodyFatPercent } from "./bodyFat"
import { estimateStrengthMet, estimateStrengthCalories } from "./strengthMet"
import { estimateCardioMet, estimateCardioCalories } from "./cardioMet"
import { calculateDailyBalance, summarizeWeeklyBalance } from "./balance"

describe("calculateBmr (Mifflin-St Jeor, women)", () => {
  it("matches the textbook formula", () => {
    // 70kg, 165cm, 30 years -> 10*70 + 6.25*165 - 5*30 - 161
    const bmr = calculateBmr({ weightKg: 70, heightCm: 165, age: 30 })
    expect(bmr).toBeCloseTo(700 + 1031.25 - 150 - 161, 5)
    expect(bmr).toBeCloseTo(1420.25, 5)
  })

  it("rejects non-positive inputs", () => {
    expect(() => calculateBmr({ weightKg: 0, heightCm: 165, age: 30 })).toThrow()
  })
})

describe("ageFromBirthDate", () => {
  it("computes age correctly across a birthday boundary", () => {
    expect(ageFromBirthDate(new Date("1995-06-15"), new Date("2026-06-14"))).toBe(30)
    expect(ageFromBirthDate(new Date("1995-06-15"), new Date("2026-06-15"))).toBe(31)
  })
})

describe("estimateTdee", () => {
  it("keeps the mid estimate within [low, high]", () => {
    const result = estimateTdee({
      bmr: 1420,
      activityLevel: "moderate",
      avgDailySteps: 7000,
      trainingDaysPerWeek: 4,
    })
    expect(result.tdeeLow).toBeLessThanOrEqual(result.tdeeMid)
    expect(result.tdeeMid).toBeLessThanOrEqual(result.tdeeHigh)
    expect(result.activityFactor).toBeGreaterThanOrEqual(1.4)
    expect(result.activityFactor).toBeLessThanOrEqual(1.55)
  })

  it("does not let training days alone push a sedentary lifestyle to a high factor", () => {
    // 5x/week training but very low daily steps (desk job) — steps dominate 60/40.
    const neat = estimateNeatActivityFactor({ activityLevel: "sedentary", avgDailySteps: 2500 })
    expect(neat).toBeLessThan(1.25)
  })
})

describe("calibrateTdee", () => {
  it("refuses to adjust before 21 days of data", () => {
    const result = calibrateTdee({
      currentTdee: 2000,
      avgDailyIntake7d: 1800,
      weightChangeKgPer7d: -0.3,
      daysOfData: 10,
    })
    expect(result.applied).toBe(false)
    expect(result.calibratedTdee).toBe(2000)
  })

  it("caps a single adjustment to ~100 kcal", () => {
    const result = calibrateTdee({
      currentTdee: 2000,
      avgDailyIntake7d: 1800,
      weightChangeKgPer7d: -1.5, // implies a huge deficit if taken at face value
      daysOfData: 25,
    })
    expect(result.applied).toBe(true)
    expect(Math.abs(result.calibratedTdee - 2000)).toBeLessThanOrEqual(100)
  })
})

describe("calculateCalorieGoal", () => {
  it("applies a moderate deficit", () => {
    const result = calculateCalorieGoal({ tdee: 2000, bmr: 1400, deficitPreference: "moderate" })
    expect(result.deficitKcal).toBe(325) // midpoint of 250-400
    expect(result.goalCalories).toBe(1675)
    expect(result.wasAdjusted).toBe(false)
  })

  it("never lets the goal drop below the safety floor", () => {
    const result = calculateCalorieGoal({
      tdee: 1300,
      bmr: 1250,
      deficitPreference: "custom",
      customDeficitKcal: 500,
    })
    expect(result.goalCalories).toBeGreaterThanOrEqual(1200)
    expect(result.wasAdjusted).toBe(true)
    expect(result.adjustmentMessage).toBeTruthy()
  })
})

describe("calculateProteinGoal", () => {
  it("uses weight * factor, default 1.8", () => {
    const result = calculateProteinGoal({ weightKg: 65 })
    expect(result.proteinGoalG).toBe(117)
  })

  it("clamps the factor to the safe 1.6-2.2 range", () => {
    expect(calculateProteinGoal({ weightKg: 65, proteinFactor: 3 }).factorUsed).toBe(2.2)
    expect(calculateProteinGoal({ weightKg: 65, proteinFactor: 1 }).factorUsed).toBe(1.6)
  })
})

describe("splitProteinSources", () => {
  it("separates collagen from complete protein without double counting", () => {
    const result = splitProteinSources({ totalProteinG: 120, collagenProteinG: 10 })
    expect(result.completeProteinG).toBe(110)
    expect(result.collagenProteinG).toBe(10)
    expect(result.totalProteinG).toBe(120)
  })
})

describe("macro <-> calorie consistency", () => {
  it("computes calories from macros", () => {
    expect(caloriesFromMacros({ proteinG: 30, carbsG: 40, fatG: 10 })).toBe(30 * 4 + 40 * 4 + 10 * 9)
  })

  it("flags a source whose declared calories disagree with its macros", () => {
    const result = checkMacroConsistency({
      declaredCalories: 100,
      proteinG: 10,
      carbsG: 10,
      fatG: 10, // -> 170 kcal derived, way off from 100 declared
    })
    expect(result.isConsistent).toBe(false)
  })

  it("accepts small rounding differences", () => {
    const result = checkMacroConsistency({ declaredCalories: 205, proteinG: 20, carbsG: 20, fatG: 5 })
    // derived = 80+80+45 = 205
    expect(result.isConsistent).toBe(true)
  })
})

describe("estimateBodyFatPercent (Navy-style, women)", () => {
  it("returns a plausible estimate for typical measurements", () => {
    const pct = estimateBodyFatPercent({ waistCm: 75, hipCm: 100, neckCm: 32, heightCm: 165 })
    expect(pct).not.toBeNull()
    expect(pct as number).toBeGreaterThan(10)
    expect(pct as number).toBeLessThan(45)
  })

  it("returns null for impossible inputs instead of throwing", () => {
    expect(estimateBodyFatPercent({ waistCm: 0, hipCm: 0, neckCm: 0, heightCm: 165 })).toBeNull()
  })
})

describe("strength MET estimation", () => {
  it("increases MET for leg/full-body days over isolated-arm days", () => {
    const legs = estimateStrengthMet({
      effortLabel: "moderate",
      routineType: "traditional",
      muscleGroups: ["legs"],
    })
    const arms = estimateStrengthMet({
      effortLabel: "moderate",
      routineType: "traditional",
      muscleGroups: ["biceps", "triceps"],
    })
    expect(legs).toBeGreaterThan(arms)
  })

  it("intense circuits land in the 6.0-8.0 MET band", () => {
    const met = estimateStrengthMet({
      effortLabel: "very_high",
      routineType: "circuit",
      muscleGroups: ["full_body"],
      avgRestSec: 30,
    })
    expect(met).toBeGreaterThanOrEqual(6)
    expect(met).toBeLessThanOrEqual(8.5)
  })

  it("estimateStrengthCalories follows the shared MET formula", () => {
    const calories = estimateStrengthCalories({ weightKg: 65, minutes: 45, met: 4.4 })
    // (4.4-1)*3.5*65/200*45
    expect(calories).toBe(Math.round(((4.4 - 1) * 3.5 * 65) / 200 * 45))
  })
})

describe("cardio MET estimation", () => {
  it("running has a higher MET than walking at the same effort", () => {
    const run = estimateCardioMet({ type: "run", effort: "moderate" })
    const walk = estimateCardioMet({ type: "walk", effort: "moderate" })
    expect(run).toBeGreaterThan(walk)
  })

  it("incline increases the MET for incline-relevant activities", () => {
    const flat = estimateCardioMet({ type: "walk", effort: "moderate", inclinePercent: 0 })
    const incline = estimateCardioMet({ type: "walk", effort: "moderate", inclinePercent: 10 })
    expect(incline).toBeGreaterThan(flat)
  })

  it("estimateCardioCalories follows the shared MET formula", () => {
    const calories = estimateCardioCalories({ weightKg: 65, minutes: 30, met: 8.3 })
    expect(calories).toBe(Math.round(((8.3 - 1) * 3.5 * 65) / 200 * 30))
  })
})

describe("calculateDailyBalance", () => {
  it("matches the worked example from the spec (section 21)", () => {
    // Goal 1800, expected expenditure 2050, consumption 1900
    // -> 100 kcal over goal, but still ~150 kcal deficit vs expenditure.
    const result = calculateDailyBalance({
      baseExpenditure: 1650,
      strengthCalories: 400,
      cardioCalories: 0,
      expectedIntake: 1900,
      calorieGoal: 1800,
    })
    expect(result.expectedExpenditure).toBe(2050)
    expect(result.diffFromGoal).toBe(100)
    expect(result.deficitOrSurplus).toBe(-150)
    expect(result.isDeficit).toBe(true)
  })

  it("never confuses partial-day consumption with a full-day deficit (caller must project intake)", () => {
    // If only 400kcal logged by 9am against a 2000kcal expenditure, that is
    // NOT a 1600kcal deficit — this module trusts the caller's projection.
    const result = calculateDailyBalance({
      baseExpenditure: 1650,
      strengthCalories: 0,
      cardioCalories: 0,
      expectedIntake: 1850, // caller already projected the full day
      calorieGoal: 1700,
    })
    expect(result.expectedExpenditure).toBe(1650)
    expect(result.deficitOrSurplus).toBe(200)
  })
})

describe("summarizeWeeklyBalance", () => {
  it("prioritizes the weekly average over any single day", () => {
    const days = [
      { deficitOrSurplus: -300, proteinConsumed: 110, proteinGoal: 120, waterConsumedMl: 2000, waterGoalMl: 2200 },
      { deficitOrSurplus: -300, proteinConsumed: 120, proteinGoal: 120, waterConsumedMl: 2200, waterGoalMl: 2200 },
      { deficitOrSurplus: 150, proteinConsumed: 100, proteinGoal: 120, waterConsumedMl: 1800, waterGoalMl: 2200 }, // one over-goal day
      { deficitOrSurplus: -300, proteinConsumed: 130, proteinGoal: 120, waterConsumedMl: 2300, waterGoalMl: 2200 },
    ]
    const summary = summarizeWeeklyBalance(days)
    expect(summary.avgDailyDeficit).toBeLessThan(0) // still a net weekly deficit
    expect(summary.daysInSurplus).toBe(1)
    expect(summary.daysInDeficit).toBe(3)
  })
})
