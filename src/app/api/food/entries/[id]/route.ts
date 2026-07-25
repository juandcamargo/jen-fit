import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await context.params

  const entry = await prisma.foodEntry.findUnique({ where: { id } })
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 })
  }

  await prisma.foodEntry.delete({ where: { id } })
  const result = await recomputeDailySummary(session.user.id, entry.date)
  return NextResponse.json({ ok: true, summary: result?.summary })
}
