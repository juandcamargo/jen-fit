import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { manualFoodSchema } from "@/lib/validation/food"
import { checkMacroConsistency } from "@/lib/calculations/macros"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = manualFoodSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data

  // Normalize to a per-100g basis internally, regardless of how the user entered it.
  let per100gFactor = 1
  if (input.basis === "per_serving") {
    if (!input.servingSizeG) {
      return NextResponse.json({ error: "Indica el tamaño de la porción en gramos." }, { status: 400 })
    }
    per100gFactor = 100 / input.servingSizeG
  }

  const caloriesPer100g = input.calories * per100gFactor
  const proteinPer100g = input.protein * per100gFactor
  const carbsPer100g = input.carbs * per100gFactor
  const fatPer100g = input.fat * per100gFactor

  const consistency = checkMacroConsistency({
    declaredCalories: caloriesPer100g,
    proteinG: proteinPer100g,
    carbsG: carbsPer100g,
    fatG: fatPer100g,
  })

  const foodItem = await prisma.foodItem.create({
    data: {
      source: "manual",
      name: input.name,
      brand: input.brand,
      servingSizeG: input.basis === "per_serving" ? input.servingSizeG : null,
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
      fiberPer100g: input.fiber != null ? input.fiber * per100gFactor : null,
      sugarPer100g: input.sugar != null ? input.sugar * per100gFactor : null,
      sodiumPer100gMg: input.sodiumMg != null ? input.sodiumMg * per100gFactor : null,
      isCollagen: input.isCollagen ?? false,
      isMacroConsistent: consistency.isConsistent,
      createdByUserId: session.user.id,
    },
  })

  return NextResponse.json({ result: foodItem, macroConsistency: consistency })
}
