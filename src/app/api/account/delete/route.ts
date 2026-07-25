import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteAccountSchema } from "@/lib/validation/auth"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = deleteAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  }

  const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!isValid) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 403 })
  }

  await prisma.user.delete({ where: { id: user.id } })

  return NextResponse.json({ ok: true })
}
