import type { FoodProvider } from "./types"
import { OpenFoodFactsProvider } from "./providers/openFoodFacts"

/**
 * Provider factory. Swapping the nutrition data source (e.g. to USDA
 * FoodData Central or Edamam) is a matter of adding a new class that
 * implements `FoodProvider` and returning it here based on env config —
 * nothing else in the app depends on Open Food Facts directly.
 */
export function getFoodProvider(): FoodProvider {
  const providerId = process.env.FOOD_PROVIDER ?? "openfoodfacts"
  switch (providerId) {
    case "openfoodfacts":
    default:
      return new OpenFoodFactsProvider()
  }
}
