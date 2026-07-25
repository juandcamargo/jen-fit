import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { startOfDay, endOfDay } from "@/lib/date"

const addWaterSchema = z.object({
  amountMl: z.number().int().min(1).max(3000),
  date: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get("date")
  const date = dateParam ? new Date(dateParam) : new Date()

  const logs = await prisma.waterLog.findMany({
    where: { userId: session.user.id, date: { gte: startOfDay(date), lte: endOfDay(date) } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ logs })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = addWaterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  const date = parsed.data.date ? new Date(parsed.data.date) : new Date()

  await prisma.waterLog.create({
    data: { userId: session.user.id, date, amountMl: parsed.data.amountMl },
  })

  const result = await recomputeDailySummary(session.user.id, date)
  return NextResponse.json({ ok: true, summary: result?.summary, newlyUnlockedBadgeCodes: result?.newlyUnlockedBadgeCodes ?? [] })
}
