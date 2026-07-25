import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { estimateBodyFatPercent } from "@/lib/calculations"
import { startOfDay } from "@/lib/date"

const schema = z.object({
  weightKg: z.number().min(30).max(300),
  date: z.string().optional(),
  waistCm: z.number().min(30).max(200).optional(),
  hipCm: z.number().min(30).max(200).optional(),
  neckCm: z.number().min(15).max(80).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const logs = await prisma.weightLog.findMany({ where: { userId: session.user.id }, orderBy: { date: "desc" }, take: 60 })
  return NextResponse.json({ logs })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data
  const date = input.date ? new Date(input.date) : new Date()
  const day = startOfDay(date)

  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })

  await prisma.weightLog.create({ data: { userId: session.user.id, date: day, weightKg: input.weightKg } })

  let bodyFatPercent: number | null = null
  if (input.waistCm && input.hipCm && input.neckCm && profile?.heightCm) {
    bodyFatPercent = estimateBodyFatPercent({
      waistCm: input.waistCm,
      hipCm: input.hipCm,
      neckCm: input.neckCm,
      heightCm: profile.heightCm,
    })
    await prisma.bodyMeasurement.create({
      data: {
        userId: session.user.id,
        date: day,
        waistCm: input.waistCm,
        hipCm: input.hipCm,
        neckCm: input.neckCm,
        bodyFatPercent,
      },
    })
  }

  const result = await recomputeDailySummary(session.user.id, date)
  return NextResponse.json({
    ok: true,
    bodyFatPercent,
    summary: result?.summary,
    newlyUnlockedBadgeCodes: result?.newlyUnlockedBadgeCodes ?? [],
  })
}
