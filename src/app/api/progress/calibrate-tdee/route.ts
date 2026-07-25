import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { calibrateTdee, calculateBmr, ageFromBirthDate } from "@/lib/calculations"
import { getWeightAtDate } from "@/lib/weight"
import { addDays, startOfDay } from "@/lib/date"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const userId = session.user.id

  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile || !profile.birthDate || !profile.heightCm) {
    return NextResponse.json({ error: "Completa tu perfil primero." }, { status: 400 })
  }

  const daysOfData = await prisma.dailySummary.count({ where: { userId } })
  if (daysOfData < 21) {
    return NextResponse.json({
      applied: false,
      message: `Necesitas al menos 21 días de datos para calibrar (llevas ${daysOfData}).`,
    })
  }

  const today = startOfDay(new Date())
  const last7Start = addDays(today, -6)

  const [last7Days, weightNow, weightWeekAgo] = await Promise.all([
    prisma.dailySummary.findMany({ where: { userId, date: { gte: last7Start, lte: today } } }),
    getWeightAtDate(userId, today),
    getWeightAtDate(userId, addDays(today, -7)),
  ])

  if (!weightNow || !weightWeekAgo || last7Days.length === 0) {
    return NextResponse.json({
      applied: false,
      message: "Necesitamos más registros de peso y de comidas de los últimos 7 días para calibrar con confianza.",
    })
  }

  const avgDailyIntake7d = last7Days.reduce((s, d) => s + d.caloriesConsumed, 0) / last7Days.length
  const weightChangeKgPer7d = weightNow - weightWeekAgo

  const age = ageFromBirthDate(profile.birthDate)
  const bmr = calculateBmr({ weightKg: weightNow, heightCm: profile.heightCm, age })
  const currentFactor = profile.activityFactor ?? 1.4
  const currentTdee = bmr * currentFactor

  const result = calibrateTdee({ currentTdee, avgDailyIntake7d, weightChangeKgPer7d, daysOfData })

  if (result.applied) {
    const newFactor = Number((result.calibratedTdee / bmr).toFixed(3))
    await prisma.$transaction([
      prisma.profile.update({
        where: { userId },
        data: {
          activityFactor: newFactor,
          calculatedTdee: result.calibratedTdee,
          tdeeConfidence: result.confidence,
          tdeeLastCalibratedAt: new Date(),
        },
      }),
      prisma.tdeeCalibration.create({
        data: {
          userId,
          date: today,
          previousTdee: Math.round(currentTdee),
          calibratedTdee: result.calibratedTdee,
          confidence: result.confidence,
        },
      }),
    ])
  }

  return NextResponse.json({
    applied: result.applied,
    calibratedTdee: result.calibratedTdee,
    confidence: result.confidence,
    message: result.applied
      ? "Tu mantenimiento estimado se ajustó según tu evolución real."
      : "No fue necesario ajustar tu estimación todavía.",
  })
}
