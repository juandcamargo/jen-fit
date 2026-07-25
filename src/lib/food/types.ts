/**
 * Provider-agnostic shape every nutrition data source normalizes into.
 * Swapping Open Food Facts for USDA/Edamam/etc. only requires a new
 * `FoodProvider` implementation — nothing downstream needs to change.
 */
export interface NormalizedFood {
  externalId: string
  source: string
  barcode?: string | null
  name: string
  brand?: string | null
  servingSizeG?: number | null
  servingLabel?: string | null
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number | null
  sugarPer100g?: number | null
  sodiumPer100gMg?: number | null
  rawJson?: unknown
}

export interface FoodProvider {
  id: string
  searchByName(query: string, page?: number): Promise<NormalizedFood[]>
  getByBarcode(barcode: string): Promise<NormalizedFood | null>
}
