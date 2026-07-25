import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeDailySummary } from "@/lib/dailySummary"
import { startOfDay, endOfDay } from "@/lib/date"
import { createFoodEntrySchema } from "@/lib/validation/foodEntry"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get("date")
  const date = dateParam ? new Date(dateParam) : new Date()

  const entries = await prisma.foodEntry.findMany({
    where: { userId: session.user.id, date: { gte: startOfDay(date), lte: endOfDay(date) } },
    include: { foodItem: true, recipe: true },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ entries })
}

/**
 * Creates a food entry. Macros are derived from the FoodItem's per-100g
 * values scaled by the logged grams — never invented. Collagen items count
 * their whole protein figure toward `proteinCollagen`, kept separate from
 * "complete" protein sources (spec section 9).
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createFoodEntrySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data
  const date = input.date ? new Date(input.date) : new Date()

  let calories = 0
  let protein = 0
  let proteinCollagen = 0
  let carbs = 0
  let fat = 0
  let fiber = 0

  if (input.foodItemId) {
    const foodItem = await prisma.foodItem.findUnique({ where: { id: input.foodItemId } })
    if (!foodItem) return NextResponse.json({ error: "Alimento no encontrado." }, { status: 404 })
    const factor = input.quantityG / 100
    calories = foodItem.caloriesPer100g * factor
    protein = foodItem.proteinPer100g * factor
    proteinCollagen = foodItem.isCollagen ? protein : 0
    carbs = foodItem.carbsPer100g * factor
    fat = foodItem.fatPer100g * factor
    fiber = (foodItem.fiberPer100g ?? 0) * factor
  } else if (input.recipeId) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: input.recipeId },
      include: { ingredients: { include: { foodItem: true } } },
    })
    if (!recipe) return NextResponse.json({ error: "Receta no encontrada." }, { status: 404 })

    const totals = recipe.ingredients.reduce(
      (acc, ing) => {
        const factor = ing.quantityG / 100
        acc.calories += ing.foodItem.caloriesPer100g * factor
        acc.protein += ing.foodItem.proteinPer100g * factor
        acc.proteinCollagen += ing.foodItem.isCollagen ? ing.foodItem.proteinPer100g * factor : 0
        acc.carbs += ing.foodItem.carbsPer100g * factor
        acc.fat += ing.foodItem.fatPer100g * factor
        acc.fiber += (ing.foodItem.fiberPer100g ?? 0) * factor
        acc.totalG += ing.quantityG
        return acc
      },
      { calories: 0, protein: 0, proteinCollagen: 0, carbs: 0, fat: 0, fiber: 0, totalG: 0 }
    )

    // input.quantityG for a recipe = grams of the finished dish being eaten now.
    const portionFactor = totals.totalG > 0 ? input.quantityG / totals.totalG : 1
    calories = totals.calories * portionFactor
    protein = totals.protein * portionFactor
    proteinCollagen = totals.proteinCollagen * portionFactor
    carbs = totals.carbs * portionFactor
    fat = totals.fat * portionFactor
    fiber = totals.fiber * portionFactor
  } else if (!input.customName) {
    return NextResponse.json(
      { error: "Indica un alimento, una receta, o un nombre para 'comí otra cosa'." },
      { status: 400 }
    )
  }

  const entry = await prisma.foodEntry.create({
    data: {
      userId: session.user.id,
      date,
      mealType: input.mealType,
      foodItemId: input.foodItemId,
      recipeId: input.recipeId,
      customName: input.customName,
      quantityG: input.quantityG,
      weightState: input.weightState,
      calories,
      protein,
      proteinCollagen,
      carbs,
      fat,
      fiber,
      isCustomEntry: !input.foodItemId && !input.recipeId,
    },
  })

  const result = await recomputeDailySummary(session.user.id, date)
  return NextResponse.json({ entry, summary: result?.summary, newlyUnlockedBadgeCodes: result?.newlyUnlockedBadgeCodes ?? [] })
}
