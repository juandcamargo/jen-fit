import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { updateProfileSchema } from "@/lib/validation/profile"
import { recomputeDailySummary } from "@/lib/dailySummary"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
  return NextResponse.json({ profile })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const { dietaryPreferences, dietaryRestrictions, birthDate, ...rest } = parsed.data

  const profile = await prisma.profile.update({
    where: { userId: session.user.id },
    data: {
      ...rest,
      ...(birthDate ? { birthDate: new Date(birthDate) } : {}),
      ...(dietaryPreferences ? { dietaryPreferences: JSON.stringify(dietaryPreferences) } : {}),
      ...(dietaryRestrictions ? { dietaryRestrictions: JSON.stringify(dietaryRestrictions) } : {}),
    },
  })

  await recomputeDailySummary(session.user.id, new Date())

  return NextResponse.json({ profile })
}
