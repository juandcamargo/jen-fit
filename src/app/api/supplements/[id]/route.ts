import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await context.params

  const supplement = await prisma.supplement.findUnique({ where: { id } })
  if (!supplement || supplement.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 })
  }

  await prisma.supplement.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
