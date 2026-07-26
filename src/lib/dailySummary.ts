import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay } from "@/lib/date"
import { getWeightAtDate } from "@/lib/weight"
import {
  calculateBmr,
  ageFromBirthDate,
  estimateNeatActivityFactor,
  estimateOnboardingActivityFactor,
  calculateCalorieGoal,
  calculateProteinGoal,
  calculateMacroGoals,
  calculateDailyBalance,
  type ActivityLevel,
  type Pace,
} from "@/lib/calculations"
import { evaluateDailyPoints } from "@/lib/gamification/points"
import { updateStreak } from "@/lib/gamification/streaks"
import { evaluateAndUnlockBadges } from "@/lib/gamification/badges"
import { syncTotalFitPoints } from "@/lib/gamification/levelSync"

export interface RecomputeResult {
  summary: Awaited<ReturnType<typeof prisma.dailySummary.upsert>>
  newlyUnlockedBadgeCodes: string[]
  leveledUp: boolean
  level: number
}

/**
 * Recomputes and persists the DailySummary for a user+day from scratch —
 * safe (and expected) to call after any mutation that touches that day
 * (food entry, water log, workout, weight, supplement). Also rolls forward
 * streaks, badges and total Fit Points, since all of those derive from the
 * same underlying data.
 */
export async function recomputeDailySummary(userId: string, date: Date): Promise<RecomputeResult | null> {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile || !profile.onboardingCompleted || !profile.heightCm || !profile.birthDate) {
    return null
  }

  const day = startOfDay(date)
  const dayEnd = endOfDay(date)

  const weightKg = await getWeightAtDate(userId, date)
  if (!weightKg) return null

  const age = ageFromBirthDate(profile.birthDate, date)
  const bmr = calculateBmr({ weightKg, heightCm: profile.heightCm, age })

  const activityLevel = profile.activityLevel as ActivityLevel
  const neatFactor = estimateNeatActivityFactor({ activityLevel, avgDailySteps: profile.avgDailySteps })
  const baseExpenditure = bmr * neatFactor

  const goalFactor =
    profile.activityFactor ??
    estimateOnboardingActivityFactor({
      activityLevel,
      avgDailySteps: profile.avgDailySteps,
      trainingDaysPerWeek: profile.trainingDaysPerWeek,
    })
  const tdee = bmr * goalFactor

  const goalResult = calculateCalorieGoal({
    tdee,
    bmr,
    deficitPreference: profile.deficitPreference as "soft" | "moderate" | "custom",
    pace: profile.pace as Pace,
    customDeficitPercent: profile.customDeficitPercent,
  })
  const proteinResult = calculateProteinGoal({ weightKg, proteinFactor: profile.proteinFactor })
  const macroResult = calculateMacroGoals({ goalCalories: goalResult.goalCalories, proteinGoalG: proteinResult.proteinGoalG })

  const [foodEntries, waterAgg, strengthWorkouts, cardioSessions, weightLoggedToday, supplementLogs] =
    await Promise.all([
      prisma.foodEntry.findMany({ where: { userId, date: { gte: day, lte: dayEnd } } }),
      prisma.waterLog.aggregate({ where: { userId, date: { gte: day, lte: dayEnd } }, _sum: { amountMl: true } }),
      prisma.strengthWorkout.findMany({ where: { userId, date: { gte: day, lte: dayEnd }, completed: true } }),
      prisma.cardioSession.findMany({ where: { userId, date: { gte: day, lte: dayEnd } } }),
      prisma.weightLog.findFirst({ where: { userId, date: { gte: day, lte: dayEnd } } }),
      prisma.supplementLog.findMany({
        where: { userId, date: { gte: day, lte: dayEnd }, taken: true },
        include: { supplement: true },
      }),
    ])

  const supplementLoggedToday = supplementLogs[0]

  // Creatine never carries calories (spec section 15). Collagen counts fully
  // toward calories and total protein, but its protein is tracked as
  // "collagen" — separate from complete protein sources.
  const supplementCalories = supplementLogs.reduce((s, l) => s + (l.supplement.isCreatine ? 0 : l.supplement.calories), 0)
  const supplementProtein = supplementLogs.reduce((s, l) => s + l.supplement.proteinG, 0)
  const supplementFat = supplementLogs.reduce((s, l) => s + l.supplement.fatG, 0)
  const supplementCarbs = supplementLogs.reduce((s, l) => s + l.supplement.carbsG, 0)
  const supplementCollagenProtein = supplementLogs
    .filter((l) => l.supplement.proteinType === "collagen")
    .reduce((s, l) => s + l.supplement.proteinG, 0)

  const caloriesConsumed = foodEntries.reduce((s, e) => s + e.calories, 0) + supplementCalories
  const proteinConsumed = foodEntries.reduce((s, e) => s + e.protein, 0) + supplementProtein
  const proteinCollagen = foodEntries.reduce((s, e) => s + e.proteinCollagen, 0) + supplementCollagenProtein
  const carbsConsumed = foodEntries.reduce((s, e) => s + e.carbs, 0) + supplementCarbs
  const fatConsumed = foodEntries.reduce((s, e) => s + e.fat, 0) + supplementFat
  const fiberConsumed = foodEntries.reduce((s, e) => s + e.fiber, 0)
  const waterConsumedMl = waterAgg._sum.amountMl ?? 0

  const strengthCalories = strengthWorkouts.reduce((s, w) => s + (w.caloriesEstimate ?? 0), 0)
  const cardioCalories = cardioSessions.reduce((s, c) => s + (c.caloriesEstimate ?? 0), 0)

  const balance = calculateDailyBalance({
    baseExpenditure,
    strengthCalories,
    cardioCalories,
    expectedIntake: caloriesConsumed,
    calorieGoal: goalResult.goalCalories,
  })

  const hasBreakfastEntry = foodEntries.some((e) => e.mealType === "breakfast")
  const hasLunchEntry = foodEntries.some((e) => e.mealType === "lunch")
  const hasDinnerEntry = foodEntries.some((e) => e.mealType === "dinner")
  const hasAllMainMeals = hasBreakfastEntry && hasLunchEntry && hasDinnerEntry
  const completedWorkout = strengthWorkouts.length > 0 || cardioSessions.length > 0

  const goalsCompleted = {
    protein: proteinConsumed >= proteinResult.proteinGoalG,
    fat: macroResult.fatGoalG > 0 && fatConsumed <= macroResult.fatGoalG * 1.1,
    carbs: macroResult.carbsGoalG > 0 && carbsConsumed <= macroResult.carbsGoalG * 1.1,
    water: profile.waterGoalMl > 0 && waterConsumedMl >= profile.waterGoalMl,
    deficit: balance.deficitOrSurplus < 0,
    workout: completedWorkout,
    logging: foodEntries.length > 0,
  }

  const points = evaluateDailyPoints({
    hasBreakfastEntry,
    hasAllMainMeals,
    proteinConsumed,
    proteinGoal: proteinResult.proteinGoalG,
    waterConsumedMl,
    waterGoalMl: profile.waterGoalMl,
    completedWorkout,
    loggedWeight: !!weightLoggedToday,
    tookSupplements: !!supplementLoggedToday,
    caloriesConsumed,
    caloriesGoal: goalResult.goalCalories,
    deficitOrSurplus: balance.deficitOrSurplus,
  })

  const sharedData = {
    caloriesConsumed,
    caloriesGoal: goalResult.goalCalories,
    targetDeficitKcal: goalResult.deficitKcal,
    bmr,
    baseExpenditure,
    exerciseCalories: balance.exerciseCalories,
    expectedExpenditure: balance.expectedExpenditure,
    proteinConsumed,
    proteinGoal: proteinResult.proteinGoalG,
    proteinCollagen,
    carbsConsumed,
    carbsGoal: macroResult.carbsGoalG,
    fatConsumed,
    fatGoal: macroResult.fatGoalG,
    fiberConsumed,
    waterConsumedMl,
    waterGoalMl: profile.waterGoalMl,
    weightKg: weightLoggedToday?.weightKg,
    deficitOrSurplus: balance.deficitOrSurplus,
    diffFromGoal: balance.diffFromGoal,
    fitPointsEarned: points.totalPoints,
    goalsCompletedJson: JSON.stringify(goalsCompleted),
  }

  const summary = await prisma.dailySummary.upsert({
    where: { userId_date: { userId, date: day } },
    create: { userId, date: day, ...sharedData },
    update: sharedData,
  })

  await Promise.all([
    updateStreak(userId, "logging", day, goalsCompleted.logging),
    updateStreak(userId, "water", day, goalsCompleted.water),
    updateStreak(userId, "training", day, goalsCompleted.workout),
  ])

  const newlyUnlockedBadgeCodes = await evaluateAndUnlockBadges(userId)
  const { leveledUp, level } = await syncTotalFitPoints(userId)

  return { summary, newlyUnlockedBadgeCodes, leveledUp, level }
}
