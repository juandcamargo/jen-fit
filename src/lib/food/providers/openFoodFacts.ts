import type { FoodProvider, NormalizedFood } from "../types"

// The Colombia-scoped OFF instance surfaces predominantly Spanish-named,
// locally-sold products first (searches for "co.openfoodfacts.org" — same
// underlying database as world.openfoodfacts.org, just filtered/ranked for
// that market), which is what this app's Spanish-speaking users expect from
// search results. We still fall back to the worldwide instance for broader
// coverage when the local instance comes up short.
const BASE_URL = process.env.OPEN_FOOD_FACTS_BASE_URL ?? "https://co.openfoodfacts.org"
const WORLD_FALLBACK_URL = "https://world.openfoodfacts.org"
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
  lang?: string
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
  "code,product_name,product_name_es,generic_name,brands,quantity,serving_size,image_url,lang,nutriments"

function hasSpanishName(product: OffProduct): boolean {
  return !!product.product_name_es || product.lang === "es"
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Open Food Facts' `cgi/search.pl` endpoint intermittently returns 503
// ("temporarily unavailable") under normal load — a couple of quick retries
// clears the vast majority of these without the user ever seeing an error.
async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          next: { revalidate: 3600 },
          signal: controller.signal,
        })
        if (response.ok) return response
        lastError = new Error(`Open Food Facts request failed with status ${response.status}`)
      } finally {
        clearTimeout(timeout)
      }
    } catch (error) {
      lastError = error
    }
    if (attempt < attempts) await sleep(400 * attempt)
  }
  throw lastError instanceof Error ? lastError : new Error("Open Food Facts request failed")
}

export class OpenFoodFactsProvider implements FoodProvider {
  id = "off"

  async searchByName(query: string, page = 1): Promise<NormalizedFood[]> {
    if (!query.trim()) return []

    let local: OffProduct[] = []
    let localFailed = false
    try {
      local = await this.searchOnHost(BASE_URL, query, page)
    } catch {
      localFailed = true
    }

    let combined = local
    // The Colombia-scoped instance can come up short on less common items (or
    // fail outright) — top up with the worldwide instance rather than
    // showing "no results" when the local database just doesn't carry it.
    if (local.length < 8) {
      try {
        const worldwide = await this.searchOnHost(WORLD_FALLBACK_URL, query, page)
        const seen = new Set(local.map((p) => p.code))
        combined = [...local, ...worldwide.filter((p) => !seen.has(p.code))]
      } catch (error) {
        // Both the local and worldwide hosts failed — a genuine outage, not
        // just a sparse local catalog, so let the caller know.
        if (localFailed) throw error
      }
    }

    // Prefer showing only Spanish-named results — but if too few of the
    // matches have one, fall back to the full (Spanish-first) list rather
    // than leaving the user with almost nothing.
    const spanishOnly = combined.filter(hasSpanishName)
    const results = spanishOnly.length >= 3 ? spanishOnly : combined
    const sorted = [...results].sort((a, b) => Number(hasSpanishName(b)) - Number(hasSpanishName(a)))

    return sorted.map(normalizeProduct).filter((p): p is NormalizedFood => p != null)
  }

  private async searchOnHost(host: string, query: string, page: number): Promise<OffProduct[]> {
    const url = new URL(`${host}/cgi/search.pl`)
    url.searchParams.set("search_terms", query)
    url.searchParams.set("search_simple", "1")
    url.searchParams.set("action", "process")
    url.searchParams.set("json", "1")
    url.searchParams.set("page_size", "24")
    url.searchParams.set("page", String(page))
    url.searchParams.set("fields", FIELDS)

    const response = await fetchWithRetry(url.toString())
    const data = (await response.json()) as { products?: OffProduct[] }
    return data.products ?? []
  }

  async getByBarcode(barcode: string): Promise<NormalizedFood | null> {
    const url = new URL(`${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`)
    url.searchParams.set("fields", FIELDS)

    let response: Response
    try {
      response = await fetchWithRetry(url.toString())
    } catch {
      return null
    }
    const data = (await response.json()) as { status?: number; product?: OffProduct }
    if (data.status !== 1 || !data.product) return null
    return normalizeProduct(data.product)
  }
}
