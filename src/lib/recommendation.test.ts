import { describe, expect, it } from "vitest"
import { projectDailyBalance, suggestWaysToCloseGap } from "./recommendation"

describe("projectDailyBalance", () => {
  it("projects onto the goal when under it, never inventing extra intake", () => {
    const result = projectDailyBalance({
      caloriesConsumedSoFar: 800,
      calorieGoal: 1600,
      baseExpenditure: 1400,
      exerciseCaloriesSoFar: 0,
      targetDeficitKcal: 300,
      weightKg: 65,
    })
    expect(result.projectedIntake).toBe(1600)
  })

  it("uses actual consumption as the projection once it already exceeds the goal", () => {
    const result = projectDailyBalance({
      caloriesConsumedSoFar: 1800,
      calorieGoal: 1600,
      baseExpenditure: 1400,
      exerciseCaloriesSoFar: 0,
      targetDeficitKcal: 300,
      weightKg: 65,
    })
    expect(result.projectedIntake).toBe(1800)
  })

  it("reports no gap when the projected deficit already meets the target", () => {
    const result = projectDailyBalance({
      caloriesConsumedSoFar: 1200,
      calorieGoal: 1300,
      baseExpenditure: 1400,
      exerciseCaloriesSoFar: 300,
      targetDeficitKcal: 300,
      weightKg: 65,
    })
    // projectedBurn = 1700, projectedIntake = 1300 -> balance -400, target -300 -> already ahead
    expect(result.onTrack).toBe(true)
    expect(result.gapToTargetKcal).toBe(0)
  })

  it("computes a positive gap when projected deficit falls short of the target", () => {
    const result = projectDailyBalance({
      caloriesConsumedSoFar: 1000,
      calorieGoal: 1700,
      baseExpenditure: 1400,
      exerciseCaloriesSoFar: 0,
      targetDeficitKcal: 300,
      weightKg: 65,
    })
    // projectedIntake 1700, projectedBurn 1400 -> balance +300 (surplus), target -300 -> gap 600
    expect(result.gapToTargetKcal).toBe(600)
    expect(result.onTrack).toBe(false)
  })
})

describe("suggestWaysToCloseGap", () => {
  it("returns no suggestions when there's no gap", () => {
    expect(suggestWaysToCloseGap({ gapKcal: 0, weightKg: 65 })).toEqual([])
  })

  it("suggests walk, HIIT and food options when there's a gap", () => {
    const suggestions = suggestWaysToCloseGap({ gapKcal: 300, weightKg: 65 })
    expect(suggestions.map((s) => s.type)).toEqual(["walk", "hiit", "food"])
    expect(suggestions[0].label).toMatch(/caminata/i)
  })
})
