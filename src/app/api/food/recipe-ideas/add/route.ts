import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { addRecipeIdeaSchema } from "@/lib/validation/foodEntry"
import { RECIPE_IDEAS } from "@/lib/recipeIdeas"

/**
 * Logs a curated recipe idea as today's (or a given date's) food entry.
 * Macros always come from the server-side catalog, never the client, and
 * the backing FoodItem is upserted once per idea (source/externalId) and
 * shared across users — same caching shape as the Open Food Facts provider.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = addRecipeIdeaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data

  const idea = RECIPE_IDEAS.find((i) => i.id === input.ideaId)
  if (!idea) return NextResponse.json({ error: "Idea de receta no encontrada." }, { status: 404 })

  const factor = 100 / idea.servingSizeG
  const foodItemData = {
    source: "recipe_idea",
    externalId: idea.id,
    name: idea.name,
    servingSizeG: idea.servingSizeG,
    servingLabel: "1 porción",
    caloriesPer100g: idea.calories * factor,
    proteinPer100g: idea.protein * factor,
    carbsPer100g: idea.carbs * factor,
    fatPer100g: idea.fat * factor,
    fiberPer100g: idea.fiber * factor,
    isVerified: true,
  }
  const foodItem = await prisma.foodItem.upsert({
    where: { source_externalId: { source: "recipe_idea", externalId: idea.id } },
    create: foodItemData,
    update: foodItemData,
  })

  const date = input.date ? new Date(input.date) : new Date()

  const entry = await prisma.foodEntry.create({
    data: {
      userId: session.user.id,
      date,
      mealType: input.mealType,
      foodItemId: foodItem.id,
      quantityG: idea.servingSizeG,
      weightState: "cooked",
      calories: idea.calories,
      protein: idea.protein,
      carbs: idea.carbs,
      fat: idea.fat,
      fiber: idea.fiber,
    },
  })

  const result = await recomputeDailySummary(session.user.id, date)
  return NextResponse.json({ entry, summary: result?.summary, newlyUnlockedBadgeCodes: result?.newlyUnlockedBadgeCodes ?? [] })
}
