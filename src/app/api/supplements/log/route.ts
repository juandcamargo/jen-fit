import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { startOfDay, endOfDay } from "@/lib/date"
import { logSupplementSchema } from "@/lib/validation/supplement"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = logSupplementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const date = parsed.data.date ? new Date(parsed.data.date) : new Date()
  const day = startOfDay(date)

  const existing = await prisma.supplementLog.findFirst({
    where: { userId: session.user.id, supplementId: parsed.data.supplementId, date: { gte: day, lte: endOfDay(date) } },
  })

  if (existing) {
    await prisma.supplementLog.update({
      where: { id: existing.id },
      data: { taken: parsed.data.taken, takenAt: parsed.data.taken ? new Date() : null },
    })
  } else {
    await prisma.supplementLog.create({
      data: {
        userId: session.user.id,
        supplementId: parsed.data.supplementId,
        date: day,
        taken: parsed.data.taken,
        takenAt: parsed.data.taken ? new Date() : null,
      },
    })
  }

  const result = await recomputeDailySummary(session.user.id, date)
  return NextResponse.json({ ok: true, summary: result?.summary })
}
