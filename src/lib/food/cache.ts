import { prisma } from "@/lib/prisma"
import { checkMacroConsistency } from "@/lib/calculations/macros"
import type { NormalizedFood } from "./types"
import type { FoodItem } from "@/generated/prisma"

/**
 * Persists a provider result as a local, normalized FoodItem — this is the
 * "save a normalized copy in the local database" step from spec section 12.
 * Re-searching the same product later hits this cache first.
 */
export async function upsertNormalizedFood(food: NormalizedFood): Promise<FoodItem> {
  const consistency = checkMacroConsistency({
    declaredCalories: food.caloriesPer100g,
    proteinG: food.proteinPer100g,
    carbsG: food.carbsPer100g,
    fatG: food.fatPer100g,
  })

  const data = {
    source: food.source,
    externalId: food.externalId,
    barcode: food.barcode,
    name: food.name,
    brand: food.brand,
    servingSizeG: food.servingSizeG,
    servingLabel: food.servingLabel,
    caloriesPer100g: food.caloriesPer100g,
    proteinPer100g: food.proteinPer100g,
    carbsPer100g: food.carbsPer100g,
    fatPer100g: food.fatPer100g,
    fiberPer100g: food.fiberPer100g,
    sugarPer100g: food.sugarPer100g,
    sodiumPer100gMg: food.sodiumPer100gMg,
    isMacroConsistent: consistency.isConsistent,
    rawJson: food.rawJson ? JSON.stringify(food.rawJson) : null,
  }

  return prisma.foodItem.upsert({
    where: { source_externalId: { source: food.source, externalId: food.externalId } },
    create: data,
    update: data,
  })
}

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function findFreshCachedByBarcode(barcode: string) {
  const cached = await prisma.foodItem.findFirst({ where: { barcode } })
  if (!cached) return null
  const isFresh = Date.now() - cached.updatedAt.getTime() < STALE_AFTER_MS
  return isFresh ? cached : null
}
