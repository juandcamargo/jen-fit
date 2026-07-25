import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { getWeightAtDate } from "@/lib/weight"
import { estimateCardioMet, estimateCardioCalories } from "@/lib/calculations"
import { createCardioSchema } from "@/lib/validation/exercise"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createCardioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data
  const date = input.date ? new Date(input.date) : new Date()

  const weightKg = await getWeightAtDate(session.user.id, date)
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

  const session_ = await prisma.cardioSession.create({
    data: {
      userId: session.user.id,
      date,
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

  const result = await recomputeDailySummary(session.user.id, date)
  return NextResponse.json({
    session: session_,
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

  const sessions = await prisma.cardioSession.findMany({
    where: {
      userId: session.user.id,
      ...(date ? { date: new Date(date) } : {}),
    },
    orderBy: { date: "desc" },
    take: 30,
  })
  return NextResponse.json({ sessions })
}
