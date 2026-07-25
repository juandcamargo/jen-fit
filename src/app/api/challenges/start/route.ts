import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const challengeId = body?.challengeId as string | undefined
  if (!challengeId) return NextResponse.json({ error: "challengeId requerido." }, { status: 400 })

  const existing = await prisma.userChallenge.findFirst({
    where: { userId: session.user.id, challengeId, completed: false },
  })
  if (existing) return NextResponse.json({ userChallenge: existing })

  const userChallenge = await prisma.userChallenge.create({
    data: { userId: session.user.id, challengeId },
  })

  return NextResponse.json({ userChallenge })
}
