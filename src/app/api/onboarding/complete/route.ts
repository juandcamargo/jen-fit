import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { onboardingSchema } from "@/lib/validation/onboarding"
import { calculateBmr, ageFromBirthDate, estimateTdee, estimateBodyFatPercent } from "@/lib/calculations"
import { seedDefaultDataForUser } from "@/lib/gamification/seedDefaults"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { startOfDay } from "@/lib/date"

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

  const bodyFatPercent = estimateBodyFatPercent({
    waistCm: input.waistCm,
    hipCm: input.hipCm,
    neckCm: input.neckCm,
    heightCm: input.heightCm,
  })

  const today = startOfDay(new Date())

  await prisma.$transaction([
    prisma.profile.update({
      where: { userId: session.user.id },
      data: {
        birthDate,
        heightCm: input.heightCm,
        waistCm: input.waistCm,
        hipCm: input.hipCm,
        neckCm: input.neckCm,
        bodyFatPercent,
        targetBodyFatPercent: input.targetBodyFatPercent,
        lastMeasuredAt: today,
        mainGoal: input.mainGoal,
        activityLevel: input.activityLevel,
        avgDailySteps: input.avgDailySteps,
        trainingDaysPerWeek: input.trainingDaysPerWeek,
        trainingTypes: JSON.stringify(input.trainingTypes),
        pace: input.pace,
        // `pace` alone now drives the deficit percentage (calculateCalorieGoal);
        // "moderate" here just means "read it from pace", not a fixed kcal amount.
        deficitPreference: "moderate",
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
      data: { userId: session.user.id, date: today, weightKg: input.currentWeightKg, note: "Peso inicial (onboarding)" },
    }),
    prisma.bodyMeasurement.create({
      data: {
        userId: session.user.id,
        date: today,
        waistCm: input.waistCm,
        hipCm: input.hipCm,
        neckCm: input.neckCm,
        bodyFatPercent,
      },
    }),
    prisma.waterSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, dailyGoalMl: input.waterGoalMl },
      update: { dailyGoalMl: input.waterGoalMl },
    }),
  ])

  await seedDefaultDataForUser(session.user.id)
  await recomputeDailySummary(session.user.id, new Date())

  return NextResponse.json({ ok: true, bmr, tdee: tdeeEstimate, bodyFatPercent })
}
