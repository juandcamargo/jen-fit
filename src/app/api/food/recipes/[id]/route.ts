import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Only ever deletes a user's own saved recipe — never a global/preloaded
// one (those have no owner, so the ownership check below excludes them).
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await context.params

  const recipe = await prisma.recipe.findUnique({ where: { id } })
  if (!recipe || recipe.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrada." }, { status: 404 })
  }

  await prisma.recipe.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
