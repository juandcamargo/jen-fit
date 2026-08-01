import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { saveRecipeIdeaSchema } from "@/lib/validation/foodEntry"
import { RECIPE_IDEAS, recipeIdeaFoodItemData } from "@/lib/recipeIdeas"

/**
 * Saves a curated recipe idea as the user's own recipe (Tus recetas), so
 * it can be reused from the "Recetas" tab without re-browsing ideas each
 * time. Uses the same shared, cached FoodItem as "Añadir a mi dieta".
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = saveRecipeIdeaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data

  const idea = RECIPE_IDEAS.find((i) => i.id === input.ideaId)
  if (!idea) return NextResponse.json({ error: "Idea de receta no encontrada." }, { status: 404 })

  const foodItemData = recipeIdeaFoodItemData(idea)
  const foodItem = await prisma.foodItem.upsert({
    where: { source_externalId: { source: "recipe_idea", externalId: idea.id } },
    create: foodItemData,
    update: foodItemData,
  })

  const recipe = await prisma.recipe.create({
    data: {
      userId: session.user.id,
      name: idea.name,
      servings: 1,
      finalWeightG: idea.servingSizeG,
      ingredients: {
        create: [{ foodItemId: foodItem.id, quantityG: idea.servingSizeG, weightState: "cooked" }],
      },
    },
    include: { ingredients: { include: { foodItem: true } } },
  })

  return NextResponse.json({ recipe })
}
