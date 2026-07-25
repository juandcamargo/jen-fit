import type { FoodProvider, NormalizedFood } from "../types"

const BASE_URL = process.env.OPEN_FOOD_FACTS_BASE_URL ?? "https://world.openfoodfacts.org"
const USER_AGENT =
  process.env.OPEN_FOOD_FACTS_USER_AGENT ?? "JenFit/1.0 (https://example.com; contact via app support)"

interface OffProduct {
  code?: string
  product_name?: string
  product_name_es?: string
  generic_name?: string
  brands?: string
  quantity?: string
  serving_size?: string
  image_url?: string
  nutriments?: Record<string, number | string | undefined>
}

function toNumber(value: unknown): number | undefined {
  const n = typeof value === "string" ? parseFloat(value) : (value as number)
  return Number.isFinite(n) ? n : undefined
}

function parseServingGrams(servingSize?: string): number | null {
  if (!servingSize) return null
  const match = servingSize.match(/([\d.,]+)\s*g/i)
  if (!match) return null
  return parseFloat(match[1].replace(",", "."))
}

function normalizeProduct(product: OffProduct): NormalizedFood | null {
  const nutriments = product.nutriments ?? {}
  const caloriesPer100g = toNumber(nutriments["energy-kcal_100g"])
  const proteinPer100g = toNumber(nutriments["proteins_100g"])
  const carbsPer100g = toNumber(nutriments["carbohydrates_100g"])
  const fatPer100g = toNumber(nutriments["fat_100g"])

  const name = product.product_name_es || product.product_name || product.generic_name
  if (!name || !product.code) return null
  // Without at least calories + the three macros, the entry isn't usable —
  // per spec section 12, never invent macros the provider doesn't have.
  if (caloriesPer100g == null || proteinPer100g == null || carbsPer100g == null || fatPer100g == null) {
    return null
  }

  const sodiumG = toNumber(nutriments["sodium_100g"])

  return {
    externalId: product.code,
    source: "off",
    barcode: product.code,
    name,
    brand: product.brands?.split(",")[0]?.trim() || null,
    servingSizeG: parseServingGrams(product.serving_size),
    servingLabel: product.serving_size || null,
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g: toNumber(nutriments["fiber_100g"]) ?? null,
    sugarPer100g: toNumber(nutriments["sugars_100g"]) ?? null,
    sodiumPer100gMg: sodiumG != null ? sodiumG * 1000 : null,
    rawJson: product,
  }
}

const FIELDS =
  "code,product_name,product_name_es,generic_name,brands,quantity,serving_size,image_url,nutriments"

export class OpenFoodFactsProvider implements FoodProvider {
  id = "off"

  async searchByName(query: string, page = 1): Promise<NormalizedFood[]> {
    if (!query.trim()) return []
    const url = new URL(`${BASE_URL}/cgi/search.pl`)
    url.searchParams.set("search_terms", query)
    url.searchParams.set("search_simple", "1")
    url.searchParams.set("action", "process")
    url.searchParams.set("json", "1")
    url.searchParams.set("page_size", "24")
    url.searchParams.set("page", String(page))
    url.searchParams.set("fields", FIELDS)

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    })
    if (!response.ok) {
      throw new Error(`Open Food Facts search failed with status ${response.status}`)
    }
    const data = (await response.json()) as { products?: OffProduct[] }
    return (data.products ?? [])
      .map(normalizeProduct)
      .filter((p): p is NormalizedFood => p != null)
  }

  async getByBarcode(barcode: string): Promise<NormalizedFood | null> {
    const url = new URL(`${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`)
    url.searchParams.set("fields", FIELDS)

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 3600 },
    })
    if (!response.ok) return null
    const data = (await response.json()) as { status?: number; product?: OffProduct }
    if (data.status !== 1 || !data.product) return null
    return normalizeProduct(data.product)
  }
}
