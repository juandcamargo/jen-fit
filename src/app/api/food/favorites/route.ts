import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const favorites = await prisma.favoriteFood.findMany({
    where: { userId: session.user.id },
    include: { foodItem: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ favorites })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const foodItemId = body?.foodItemId as string | undefined
  if (!foodItemId) return NextResponse.json({ error: "foodItemId requerido." }, { status: 400 })

  const favorite = await prisma.favoriteFood.upsert({
    where: { userId_foodItemId: { userId: session.user.id, foodItemId } },
    create: { userId: session.user.id, foodItemId },
    update: {},
  })
  return NextResponse.json({ favorite })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const foodItemId = searchParams.get("foodItemId")
  if (!foodItemId) return NextResponse.json({ error: "foodItemId requerido." }, { status: 400 })

  await prisma.favoriteFood.deleteMany({ where: { userId: session.user.id, foodItemId } })
  return NextResponse.json({ ok: true })
}
