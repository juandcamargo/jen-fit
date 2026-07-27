import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { getWeightAtDate } from "@/lib/weight"
import { estimateCardioMet, estimateCardioCalories } from "@/lib/calculations"
import { createCardioSchema } from "@/lib/validation/exercise"
import { dateKey } from "@/lib/date"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await params

  const cardioSession = await prisma.cardioSession.findFirst({ where: { id, userId: session.user.id } })
  if (!cardioSession) return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 })
  return NextResponse.json({ session: cardioSession })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await params

  const existing = await prisma.cardioSession.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 })

  const body = await request.json().catch(() => null)
  const parsed = createCardioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data
  const newDate = input.date ? new Date(input.date) : existing.date

  const weightKg = await getWeightAtDate(session.user.id, newDate)
  if (!weightKg) {
    return NextResponse.json({ error: "Registra tu peso primero para estimar el gasto." }, { status: 400 })
  }

  const met = estimateCardioMet({
    type: input.type,
    effort: input.effort,
    inclinePercent: input.inclinePercent,
    avgHeartRate: input.avgHeartRate,
  })
  const caloriesEstimate = estimateCardioCalories({ weightKg, minutes: input.minutes, met })

  const cardioSession = await prisma.cardioSession.update({
    where: { id },
    data: {
      date: newDate,
      type: input.type,
      minutes: input.minutes,
      effort: input.effort,
      rpe: input.rpe,
      distanceKm: input.distanceKm,
      speedKmh: input.speedKmh,
      inclinePercent: input.inclinePercent,
      avgHeartRate: input.avgHeartRate,
      caloriesEstimate,
    },
  })

  const result = await recomputeDailySummary(session.user.id, newDate)
  if (dateKey(existing.date) !== dateKey(newDate)) {
    await recomputeDailySummary(session.user.id, existing.date)
  }

  return NextResponse.json({ session: cardioSession, met, summary: result?.summary })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await params

  const existing = await prisma.cardioSession.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 })

  await prisma.cardioSession.delete({ where: { id } })
  const result = await recomputeDailySummary(session.user.id, existing.date)
  return NextResponse.json({ ok: true, summary: result?.summary })
}
