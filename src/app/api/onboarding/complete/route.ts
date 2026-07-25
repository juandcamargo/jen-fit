import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { onboardingSchema } from "@/lib/validation/onboarding"
import { calculateBmr, ageFromBirthDate, estimateTdee } from "@/lib/calculations"
import { seedDefaultDataForUser } from "@/lib/gamification/seedDefaults"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { startOfDay } from "@/lib/date"

const PACE_TO_DEFICIT: Record<string, { deficitPreference: "soft" | "moderate" | "custom"; customDeficitKcal?: number }> = {
  gradual: { deficitPreference: "soft" },
  moderate: { deficitPreference: "moderate" },
  faster: { deficitPreference: "custom", customDeficitKcal: 450 },
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = onboardingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data
  const birthDate = new Date(input.birthDate)
  const age = ageFromBirthDate(birthDate)
  const bmr = calculateBmr({ weightKg: input.currentWeightKg, heightCm: input.heightCm, age })
  const tdeeEstimate = estimateTdee({
    bmr,
    activityLevel: input.activityLevel,
    avgDailySteps: input.avgDailySteps,
    trainingDaysPerWeek: input.trainingDaysPerWeek,
  })

  const deficitConfig = PACE_TO_DEFICIT[input.pace]

  await prisma.$transaction([
    prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        birthDate,
        heightCm: input.heightCm,
        targetWeightKg: input.targetWeightKg,
        mainGoal: input.mainGoal,
        activityLevel: input.activityLevel,
        avgDailySteps: input.avgDailySteps,
        trainingDaysPerWeek: input.trainingDaysPerWeek,
        trainingTypes: JSON.stringify(input.trainingTypes),
        pace: input.pace,
        deficitPreference: deficitConfig.deficitPreference,
        customDeficitKcal: deficitConfig.customDeficitKcal,
        proteinFactor: input.proteinFactor,
        waterGoalMl: input.waterGoalMl,
        calculatedBmr: bmr,
        calculatedTdee: tdeeEstimate.tdeeMid,
        tdeeConfidence: "low",
        onboardingCompleted: true,
        onboardingStep: 6,
      },
    }),
    prisma.weightLog.create({
      data: { userId: session.user.id, date: startOfDay(new Date()), weightKg: input.currentWeightKg, note: "Peso inicial (onboarding)" },
    }),
    prisma.waterSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, dailyGoalMl: input.waterGoalMl },
      update: { dailyGoalMl: input.waterGoalMl },
    }),
  ])

  await seedDefaultDataForUser(session.user.id)
  await recomputeDailySummary(session.user.id, new Date())

  return NextResponse.json({ ok: true, bmr, tdee: tdeeEstimate })
}
