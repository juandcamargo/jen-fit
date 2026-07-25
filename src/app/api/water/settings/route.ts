import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const updateSchema = z.object({
  dailyGoalMl: z.number().int().min(500).max(6000).optional(),
  reminderStart: z.string().optional(),
  reminderEnd: z.string().optional(),
  frequencyMin: z.number().int().min(15).max(360).optional(),
  nightPause: z.boolean().optional(),
  remindersOn: z.boolean().optional(),
})

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  const settings = await prisma.waterSettings.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  })

  if (parsed.data.dailyGoalMl) {
    await prisma.profile.update({ where: { userId: session.user.id }, data: { waterGoalMl: parsed.data.dailyGoalMl } })
  }

  return NextResponse.json({ settings })
}
