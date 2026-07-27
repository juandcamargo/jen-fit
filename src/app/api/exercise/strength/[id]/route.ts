import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { getWeightAtDate } from "@/lib/weight"
import { estimateStrengthMet, estimateStrengthCalories, type MuscleGroup } from "@/lib/calculations"
import { createStrengthWorkoutSchema } from "@/lib/validation/exercise"
import { dateKey } from "@/lib/date"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await params

  const workout = await prisma.strengthWorkout.findFirst({
    where: { id, userId: session.user.id },
    include: { sets: true },
  })
  if (!workout) return NextResponse.json({ error: "Entrenamiento no encontrado." }, { status: 404 })
  return NextResponse.json({ workout })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await params

  const existing = await prisma.strengthWorkout.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Entrenamiento no encontrado." }, { status: 404 })

  const body = await request.json().catch(() => null)
  const parsed = createStrengthWorkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data
  const newDate = input.date ? new Date(input.date) : existing.date

  const weightKg = await getWeightAtDate(session.user.id, newDate)
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

  await prisma.strengthSet.deleteMany({ where: { workoutId: id } })
  const workout = await prisma.strengthWorkout.update({
    where: { id },
    data: {
      date: newDate,
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

  const result = await recomputeDailySummary(session.user.id, newDate)
  if (dateKey(existing.date) !== dateKey(newDate)) {
    await recomputeDailySummary(session.user.id, existing.date)
  }

  return NextResponse.json({ workout, met, summary: result?.summary })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await params

  const existing = await prisma.strengthWorkout.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Entrenamiento no encontrado." }, { status: 404 })

  await prisma.strengthWorkout.delete({ where: { id } })
  const result = await recomputeDailySummary(session.user.id, existing.date)
  return NextResponse.json({ ok: true, summary: result?.summary })
}
