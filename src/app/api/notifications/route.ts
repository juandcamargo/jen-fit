import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const settings = await prisma.notificationSetting.findMany({ where: { userId: session.user.id } })
  return NextResponse.json({ settings })
}

const updateSchema = z.object({
  type: z.string(),
  enabled: z.boolean().optional(),
  time: z.string().optional(),
})

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })

  const setting = await prisma.notificationSetting.upsert({
    where: { userId_type: { userId: session.user.id, type: parsed.data.type } },
    create: { userId: session.user.id, type: parsed.data.type, enabled: parsed.data.enabled ?? true, time: parsed.data.time },
    update: { enabled: parsed.data.enabled, time: parsed.data.time },
  })
  return NextResponse.json({ setting })
}
