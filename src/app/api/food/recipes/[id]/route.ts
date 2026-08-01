import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Personal recipes are hard-deleted. Global (preloaded) recipes are never
// deleted — they're shared by every account — instead this hides the
// recipe from just this user's "Recetas guardadas"; it stays available in
// Recomendaciones to re-save later.
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const { id } = await context.params

  const recipe = await prisma.recipe.findUnique({ where: { id } })
  if (!recipe) return NextResponse.json({ error: "No encontrada." }, { status: 404 })

  if (recipe.isGlobal) {
    await prisma.hiddenRecipe.upsert({
      where: { userId_recipeId: { userId: session.user.id, recipeId: id } },
      create: { userId: session.user.id, recipeId: id },
      update: {},
    })
    return NextResponse.json({ ok: true, hidden: true })
  }

  if (recipe.userId !== session.user.id) {
    return NextResponse.json({ error: "No encontrada." }, { status: 404 })
  }

  await prisma.recipe.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
