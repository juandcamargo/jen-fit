import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createSupplementSchema } from "@/lib/validation/supplement"
import { startOfDay, endOfDay } from "@/lib/date"

const PRESET_CONFIG: Record<string, { proteinType: "complete" | "collagen" | "none"; isCreatine: boolean }> = {
  collagen: { proteinType: "collagen", isCreatine: false },
  creatine: { proteinType: "none", isCreatine: true },
  protein_powder: { proteinType: "complete", isCreatine: false },
  multivitamin: { proteinType: "none", isCreatine: false },
  omega3: { proteinType: "none", isCreatine: false },
  magnesium: { proteinType: "none", isCreatine: false },
  other: { proteinType: "none", isCreatine: false },
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const today = startOfDay(new Date())
  const supplements = await prisma.supplement.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "asc" },
    include: {
      logs: { where: { date: { gte: today, lte: endOfDay(today) } } },
    },
  })

  return NextResponse.json({
    supplements: supplements.map((s) => ({ ...s, takenToday: s.logs.some((l) => l.taken) })),
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createSupplementSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data
  const config = PRESET_CONFIG[input.preset]

  const supplement = await prisma.supplement.create({
    data: {
      userId: session.user.id,
      name: input.name,
      dose: input.dose,
      unit: input.unit,
      recommendedTime: input.recommendedTime,
      frequency: input.frequency,
      brand: input.brand,
      notes: input.notes,
      calories: config.isCreatine ? 0 : input.calories,
      proteinG: input.proteinG,
      fatG: config.isCreatine ? 0 : input.fatG,
      carbsG: config.isCreatine ? 0 : input.carbsG,
      proteinType: config.proteinType,
      isCreatine: config.isCreatine,
    },
  })

  return NextResponse.json({ supplement })
}
