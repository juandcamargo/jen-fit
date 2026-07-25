import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { getWeightAtDate } from "@/lib/weight"
import { estimateStrengthMet, estimateStrengthCalories, type MuscleGroup } from "@/lib/calculations"
import { createStrengthWorkoutSchema } from "@/lib/validation/exercise"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createStrengthWorkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data
  const date = input.date ? new Date(input.date) : new Date()

  const weightKg = await getWeightAtDate(session.user.id, date)
  if (!weightKg) {
    return NextResponse.json({ error: "Registra tu peso primero para estimar el gasto." }, { status: 400 })
  }

  const met = estimateStrengthMet({
    effortLabel: input.effortLabel,
    rpe: input.rpe,
    routineType: input.routineType,
    muscleGroups: input.muscleGroups as MuscleGroup[],
    avgRestSec: input.avgRestSec,
  })
  const caloriesEstimate = estimateStrengthCalories({ weightKg, minutes: input.durationMin, met })

  const workout = await prisma.strengthWorkout.create({
    data: {
      userId: session.user.id,
      date,
      name: input.name,
      muscleGroupsJson: JSON.stringify(input.muscleGroups),
      durationMin: input.durationMin,
      avgRestSec: input.avgRestSec,
      routineType: input.routineType,
      rpe: input.rpe,
      effortLabel: input.effortLabel,
      caloriesEstimate,
      sets: { create: input.sets },
    },
    include: { sets: true },
  })

  const result = await recomputeDailySummary(session.user.id, date)
  return NextResponse.json({
    workout,
    met,
    summary: result?.summary,
    newlyUnlockedBadgeCodes: result?.newlyUnlockedBadgeCodes ?? [],
  })
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")

  const workouts = await prisma.strengthWorkout.findMany({
    where: {
      userId: session.user.id,
      ...(date ? { date: new Date(date) } : {}),
    },
    include: { sets: true },
    orderBy: { date: "desc" },
    take: 30,
  })
  return NextResponse.json({ workouts })
}
