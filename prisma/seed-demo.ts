/**
 * Demo data for Jen Fit — a fictional user with ~2 weeks of realistic
 * activity, so every screen has something to show out of the box.
 *
 * Safe to re-run (wipes and recreates the demo account each time).
 * Remove the demo account any time from Perfil → Eliminar cuenta, or run:
 *   npm run db:seed-demo -- --clear
 */
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { seedDefaultDataForUser } from "@/lib/gamification/seedDefaults"
import { recomputeDailySummary } from "@/lib/dailySummary"
import {
  estimateStrengthMet,
  estimateStrengthCalories,
  estimateCardioMet,
  estimateCardioCalories,
  estimateBodyFatPercent,
} from "@/lib/calculations"
import { startOfDay, addDays } from "@/lib/date"

const DEMO_EMAIL = "demo@jenfit.app"
const DEMO_PASSWORD = "Demo1234"
const DAYS_OF_HISTORY = 13

async function clearDemoUser() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } })
    console.log("Cuenta demo anterior eliminada.")
  }
}

async function main() {
  if (process.argv.includes("--clear")) {
    await clearDemoUser()
    return
  }

  await clearDemoUser()

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const today = startOfDay(new Date())
  const startDate = addDays(today, -DAYS_OF_HISTORY)

  const initialWaistCm = 78
  const initialHipCm = 101
  const initialNeckCm = 32
  const initialBodyFatPercent = estimateBodyFatPercent({
    waistCm: initialWaistCm,
    hipCm: initialHipCm,
    neckCm: initialNeckCm,
    heightCm: 163,
  })

  const user = await prisma.user.create({
    data: {
      name: "Valentina Torres",
      email: DEMO_EMAIL,
      passwordHash,
      profile: {
        create: {
          name: "Valentina Torres",
          birthDate: new Date("1996-04-12"),
          heightCm: 163,
          waistCm: initialWaistCm,
          hipCm: initialHipCm,
          neckCm: initialNeckCm,
          bodyFatPercent: initialBodyFatPercent,
          targetBodyFatPercent: 24,
          lastMeasuredAt: startDate,
          mainGoal: "reduce_fat",
          activityLevel: "moderate",
          avgDailySteps: 6500,
          trainingDaysPerWeek: 4,
          trainingTypes: JSON.stringify(["strength", "cardio"]),
          pace: "moderate",
          deficitPreference: "moderate",
          proteinFactor: 1.8,
          waterGoalMl: 2400,
          units: "metric",
          onboardingCompleted: true,
          onboardingStep: 6,
          calculatedBmr: 1380,
          calculatedTdee: 1950,
          tdeeConfidence: "medium",
        },
      },
      waterSettings: { create: { dailyGoalMl: 2400 } },
    },
  })

  await seedDefaultDataForUser(user.id)

  // Starting weight trends gently down; waist/body-fat measured weekly.
  for (let i = 0; i <= DAYS_OF_HISTORY; i += 2) {
    const date = addDays(startDate, i)
    const weightKg = 65.4 - i * 0.09
    await prisma.weightLog.create({ data: { userId: user.id, date, weightKg: Number(weightKg.toFixed(1)) } })
  }
  for (let i = 0; i <= DAYS_OF_HISTORY; i += 7) {
    const date = addDays(startDate, i)
    const waistCm = Number((initialWaistCm - i * 0.05).toFixed(1))
    const hipCm = Number((initialHipCm - i * 0.03).toFixed(1))
    const bodyFatPercent = estimateBodyFatPercent({ waistCm, hipCm, neckCm: initialNeckCm, heightCm: 163 })
    await prisma.bodyMeasurement.create({
      data: { userId: user.id, date, waistCm, hipCm, neckCm: initialNeckCm, bodyFatPercent },
    })
  }

  // Reusable food items (manual entries — no network calls needed for demo data).
  const foodDefs = [
    { name: "Huevos revueltos", caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, fiberPer100g: 0 },
    { name: "Arepa de maíz", caloriesPer100g: 216, proteinPer100g: 5.5, carbsPer100g: 44, fatPer100g: 2.4, fiberPer100g: 3.5 },
    { name: "Pechuga de pollo a la plancha", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0 },
    { name: "Arroz blanco cocido", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0.4 },
    { name: "Ensalada mixta con aguacate", caloriesPer100g: 110, proteinPer100g: 1.8, carbsPer100g: 6, fatPer100g: 9, fiberPer100g: 3.8 },
    { name: "Avena en agua con fruta", caloriesPer100g: 90, proteinPer100g: 3.2, carbsPer100g: 16, fatPer100g: 1.6, fiberPer100g: 2.2 },
    { name: "Batido de proteína whey", caloriesPer100g: 110, proteinPer100g: 21, carbsPer100g: 3, fatPer100g: 1.8, fiberPer100g: 0.5 },
    { name: "Yogur griego natural", caloriesPer100g: 97, proteinPer100g: 9, carbsPer100g: 3.9, fatPer100g: 5, fiberPer100g: 0 },
    { name: "Lentejas guisadas", caloriesPer100g: 116, proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 0.4, fiberPer100g: 7.9 },
    { name: "Salmón al horno", caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, fiberPer100g: 0 },
  ]
  const foods = await Promise.all(
    foodDefs.map((f) => prisma.foodItem.create({ data: { ...f, source: "manual", isVerified: true, createdByUserId: user.id } }))
  )
  const [eggs, arepa, chicken, rice, salad, oats, wheyShake, yogurt, lentils, salmon] = foods

  // Supplements: collagen (calories + protein, tracked separately) and creatine (no calories).
  const collagen = await prisma.supplement.create({
    data: {
      userId: user.id,
      name: "Colágeno hidrolizado",
      dose: 10,
      unit: "g",
      recommendedTime: "08:00",
      calories: 36,
      proteinG: 9,
      proteinType: "collagen",
      isCreatine: false,
    },
  })
  const creatine = await prisma.supplement.create({
    data: {
      userId: user.id,
      name: "Creatina monohidratada",
      dose: 5,
      unit: "g",
      calories: 0,
      proteinG: 0,
      proteinType: "none",
      isCreatine: true,
    },
  })

  const MEAL_PLAN: { mealType: string; foodId: string; grams: number }[][] = []
  for (let i = 0; i <= DAYS_OF_HISTORY; i++) {
    const skipDinner = i % 6 === 5 // occasional lighter day, never framed as a "failure"
    const day = [
      { mealType: "breakfast", foodId: i % 2 === 0 ? eggs.id : oats.id, grams: i % 2 === 0 ? 120 : 220 },
      { mealType: "breakfast", foodId: arepa.id, grams: 90 },
      { mealType: "lunch", foodId: chicken.id, grams: 150 },
      { mealType: "lunch", foodId: rice.id, grams: 120 },
      { mealType: "lunch", foodId: salad.id, grams: 100 },
      { mealType: "snack", foodId: i % 3 === 0 ? wheyShake.id : yogurt.id, grams: i % 3 === 0 ? 30 : 170 },
      ...(skipDinner ? [] : [
        { mealType: "dinner", foodId: i % 4 === 0 ? salmon.id : lentils.id, grams: 160 },
        { mealType: "dinner", foodId: salad.id, grams: 80 },
      ]),
    ]
    MEAL_PLAN.push(day)
  }

  for (let i = 0; i <= DAYS_OF_HISTORY; i++) {
    const date = addDays(startDate, i)
    for (const item of MEAL_PLAN[i]) {
      const food = foods.find((f) => f.id === item.foodId)!
      const factor = item.grams / 100
      await prisma.foodEntry.create({
        data: {
          userId: user.id,
          date,
          mealType: item.mealType,
          foodItemId: food.id,
          quantityG: item.grams,
          weightState: "cooked",
          calories: food.caloriesPer100g * factor,
          protein: food.proteinPer100g * factor,
          proteinCollagen: 0,
          carbs: food.carbsPer100g * factor,
          fat: food.fatPer100g * factor,
          fiber: (food.fiberPer100g ?? 0) * factor,
        },
      })
    }

    // Water: usually hits goal, a couple of lighter days.
    const waterTargets = i % 5 === 4 ? [350, 500, 350] : [350, 500, 500, 350, 350];
    for (const amount of waterTargets) {
      await prisma.waterLog.create({ data: { userId: user.id, date, amountMl: amount } })
    }

    // Supplements: collagen most days, creatine on training days.
    if (i % 7 !== 6) {
      await prisma.supplementLog.create({ data: { userId: user.id, supplementId: collagen.id, date, taken: true, takenAt: date } })
    }
    const isTrainingDay = i % 2 === 0
    if (isTrainingDay) {
      await prisma.supplementLog.create({ data: { userId: user.id, supplementId: creatine.id, date, taken: true, takenAt: date } })

      const weightAt = 65.4 - i * 0.09
      const muscleGroups = i % 4 === 0 ? ["legs", "glutes"] : i % 4 === 2 ? ["chest", "back"] : ["full_body"]
      const met = estimateStrengthMet({
        effortLabel: "moderate",
        routineType: "traditional",
        muscleGroups: muscleGroups as never,
        avgRestSec: 60,
      })
      const durationMin = 50
      const caloriesEstimate = estimateStrengthCalories({ weightKg: weightAt, minutes: durationMin, met })
      const workout = await prisma.strengthWorkout.create({
        data: {
          userId: user.id,
          date,
          name: muscleGroups.includes("legs") ? "Pierna y glúteo" : muscleGroups.includes("chest") ? "Empuje" : "Full body",
          muscleGroupsJson: JSON.stringify(muscleGroups),
          durationMin,
          avgRestSec: 60,
          routineType: "traditional",
          effortLabel: "moderate",
          caloriesEstimate,
        },
      })
      const exerciseName = muscleGroups.includes("legs") ? "Sentadilla" : muscleGroups.includes("chest") ? "Press banca" : "Peso muerto";
      for (let setNumber = 1; setNumber <= 3; setNumber++) {
        await prisma.strengthSet.create({
          data: {
            workoutId: workout.id,
            exerciseName,
            muscleGroup: muscleGroups[0],
            setNumber,
            reps: 10,
            weightKg: 20 + setNumber * 2.5,
          },
        })
      }

      if (i % 4 === 0) {
        const cardioMet = estimateCardioMet({ type: "walk", effort: "moderate" })
        const cardioCalories = estimateCardioCalories({ weightKg: weightAt, minutes: 25, met: cardioMet })
        await prisma.cardioSession.create({
          data: { userId: user.id, date, type: "walk", minutes: 25, effort: "moderate", caloriesEstimate: cardioCalories },
        })
      }
    }
  }

  // Recompute chronologically so streaks, badges and Fit Points accrue naturally.
  for (let i = 0; i <= DAYS_OF_HISTORY; i++) {
    await recomputeDailySummary(user.id, addDays(startDate, i))
  }

  console.log("Cuenta demo creada:")
  console.log(`  Email:    ${DEMO_EMAIL}`)
  console.log(`  Password: ${DEMO_PASSWORD}`)
  console.log(`  ${DAYS_OF_HISTORY + 1} días de historial generados.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
