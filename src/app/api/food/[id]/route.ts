import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { foodCorrectionSchema } from "@/lib/validation/food"
import { checkMacroConsistency } from "@/lib/calculations/macros"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  }
  const { id } = await context.params
  const foodItem = await prisma.foodItem.findUnique({ where: { id } })
  if (!foodItem) return NextResponse.json({ error: "No encontrado." }, { status: 404 })
  return NextResponse.json({ result: foodItem })
}

/** Manual correction of a food item's macros (spec section 12: "permitir corrección manual"). */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  }
  const { id } = await context.params

  const body = await request.json().catch(() => null)
  const parsed = foodCorrectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  const existing = await prisma.foodItem.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "No encontrado." }, { status: 404 })

  const merged = { ...existing, ...parsed.data }
  const consistency = checkMacroConsistency({
    declaredCalories: merged.caloriesPer100g,
    proteinG: merged.proteinPer100g,
    carbsG: merged.carbsPer100g,
    fatG: merged.fatPer100g,
  })

  const updated = await prisma.foodItem.update({
    where: { id },
    data: { ...parsed.data, isMacroConsistent: consistency.isConsistent },
  })

  return NextResponse.json({ result: updated, macroConsistency: consistency })
}
