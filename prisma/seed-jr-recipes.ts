import { PrismaClient } from "../src/generated/prisma"

const prisma = new PrismaClient()

// Menú semanal de Jeniffer Ramirez (Lun-Sáb), preloaded as global recipes
// (isGlobal: true, userId: null) visible by default to every account. This
// script is idempotent — safe to re-run. Nutrition values below are typical
// per-100g figures (USDA-style) for each raw ingredient — the app computes
// each recipe's real macros by summing ingredient contributions, same as
// any user-created recipe.
interface IngredientDef {
  name: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  fiberPer100g?: number
}

const INGREDIENTS: IngredientDef[] = [
  { name: "Pechuga de pollo", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  { name: "Carne de res magra", caloriesPer100g: 137, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 6 },
  { name: "Salmón", caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13 },
  { name: "Tilapia", caloriesPer100g: 96, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 1.7 },
  { name: "Huevo entero", caloriesPer100g: 143, proteinPer100g: 12.6, carbsPer100g: 0.7, fatPer100g: 9.5 },
  { name: "Clara de huevo", caloriesPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2 },
  { name: "Queso mozzarella light", caloriesPer100g: 220, proteinPer100g: 28, carbsPer100g: 3, fatPer100g: 10 },
  { name: "Queso parmesano rallado", caloriesPer100g: 431, proteinPer100g: 38, carbsPer100g: 4, fatPer100g: 29 },
  { name: "Arroz blanco cocido", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0.4 },
  { name: "Pasta seca", caloriesPer100g: 371, proteinPer100g: 13, carbsPer100g: 75, fatPer100g: 1.5, fiberPer100g: 3 },
  { name: "Papa", caloriesPer100g: 87, proteinPer100g: 2, carbsPer100g: 20, fatPer100g: 0.1, fiberPer100g: 1.8 },
  { name: "Papa criolla", caloriesPer100g: 90, proteinPer100g: 2, carbsPer100g: 20.5, fatPer100g: 0.1, fiberPer100g: 1.8 },
  { name: "Fríjoles negros cocidos", caloriesPer100g: 132, proteinPer100g: 8.9, carbsPer100g: 24, fatPer100g: 0.5, fiberPer100g: 8.7 },
  { name: "Maíz dulce", caloriesPer100g: 86, proteinPer100g: 3.2, carbsPer100g: 19, fatPer100g: 1.2, fiberPer100g: 2 },
  { name: "Tortilla de maíz", caloriesPer100g: 218, proteinPer100g: 5.7, carbsPer100g: 44, fatPer100g: 2.9, fiberPer100g: 4 },
  { name: "Tortilla integral", caloriesPer100g: 283, proteinPer100g: 8, carbsPer100g: 43, fatPer100g: 7.5, fiberPer100g: 6 },
  { name: "Pan integral para hamburguesa", caloriesPer100g: 260, proteinPer100g: 10, carbsPer100g: 48, fatPer100g: 4, fiberPer100g: 5 },
  { name: "Pan de masa madre", caloriesPer100g: 250, proteinPer100g: 8.8, carbsPer100g: 50, fatPer100g: 1.5, fiberPer100g: 2.5 },
  { name: "Arepa de maíz", caloriesPer100g: 217, proteinPer100g: 5, carbsPer100g: 45, fatPer100g: 1.7, fiberPer100g: 3 },
  { name: "Guacamole", caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15, fiberPer100g: 6 },
  { name: "Aceite de oliva", caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100 },
  { name: "Almendras", caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50, fiberPer100g: 12 },
  { name: "Nueces", caloriesPer100g: 654, proteinPer100g: 15, carbsPer100g: 14, fatPer100g: 65, fiberPer100g: 7 },
  { name: "Avena", caloriesPer100g: 389, proteinPer100g: 17, carbsPer100g: 66, fatPer100g: 7, fiberPer100g: 10 },
  { name: "Leche evaporada descremada", caloriesPer100g: 92, proteinPer100g: 9.4, carbsPer100g: 13.6, fatPer100g: 0.3 },
  { name: "Fresas", caloriesPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3, fiberPer100g: 2 },
  { name: "Arándanos", caloriesPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14.5, fatPer100g: 0.3, fiberPer100g: 2.4 },
  { name: "Piña", caloriesPer100g: 50, proteinPer100g: 0.5, carbsPer100g: 13.1, fatPer100g: 0.1, fiberPer100g: 1.4 },
  { name: "Manzana", caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 13.8, fatPer100g: 0.2, fiberPer100g: 2.4 },
  { name: "Plátano", caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, fiberPer100g: 2.6 },
  { name: "Tomate", caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, fiberPer100g: 1.2 },
  { name: "Cebolla", caloriesPer100g: 40, proteinPer100g: 1.1, carbsPer100g: 9.3, fatPer100g: 0.1, fiberPer100g: 1.7 },
  { name: "Espinaca fresca", caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 2.2 },
  { name: "Champiñones", caloriesPer100g: 22, proteinPer100g: 3.1, carbsPer100g: 3.3, fatPer100g: 0.3, fiberPer100g: 1 },
  { name: "Zucchini", caloriesPer100g: 17, proteinPer100g: 1.2, carbsPer100g: 3.1, fatPer100g: 0.3, fiberPer100g: 1 },
  { name: "Zanahoria", caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 9.6, fatPer100g: 0.2, fiberPer100g: 2.8 },
  { name: "Brócoli", caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 6.6, fatPer100g: 0.4, fiberPer100g: 2.6 },
  { name: "Ahuyama", caloriesPer100g: 26, proteinPer100g: 1, carbsPer100g: 6.5, fatPer100g: 0.1, fiberPer100g: 0.5 },
  { name: "Caldo de pollo bajo en sodio", caloriesPer100g: 10, proteinPer100g: 0.8, carbsPer100g: 0.8, fatPer100g: 0.4 },
  { name: "Caldo de res bajo en sodio", caloriesPer100g: 10, proteinPer100g: 1, carbsPer100g: 0.8, fatPer100g: 0.3 },
  { name: "Proteína vegetal en polvo", caloriesPer100g: 433, proteinPer100g: 73, carbsPer100g: 13, fatPer100g: 8, fiberPer100g: 3 },
  { name: "Creatina", caloriesPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 },
  { name: "Pechuga de pavo (fiambre)", caloriesPer100g: 104, proteinPer100g: 17, carbsPer100g: 2, fatPer100g: 3 },
  { name: "Yogur griego bajo en grasa", caloriesPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.4 },
  { name: "Mantequilla de almendras", caloriesPer100g: 614, proteinPer100g: 21, carbsPer100g: 19, fatPer100g: 55, fiberPer100g: 10 },
  { name: "Pepino", caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, fiberPer100g: 0.5 },
  { name: "Lechuga romana", caloriesPer100g: 15, proteinPer100g: 1.4, carbsPer100g: 2.9, fatPer100g: 0.2, fiberPer100g: 2.1 },
  { name: "Pimentón rojo", caloriesPer100g: 31, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.3, fiberPer100g: 2.1 },
  { name: "Habichuelas", caloriesPer100g: 31, proteinPer100g: 1.8, carbsPer100g: 7, fatPer100g: 0.2, fiberPer100g: 3.4 },
  { name: "Salsa de tomate natural", caloriesPer100g: 20, proteinPer100g: 1, carbsPer100g: 4, fatPer100g: 0.2, fiberPer100g: 1 },
  { name: "Mezcla proteica para pancakes", caloriesPer100g: 360, proteinPer100g: 36, carbsPer100g: 24, fatPer100g: 12, fiberPer100g: 8 },
]

interface RecipeDef {
  name: string
  ingredients: { name: string; quantityG: number }[]
}

const RECIPES: RecipeDef[] = [
  {
    name: "Pancakes de frutos rojos",
    ingredients: [
      { name: "Mezcla proteica para pancakes", quantityG: 50 },
      { name: "Huevo entero", quantityG: 50 },
      { name: "Clara de huevo", quantityG: 90 },
      { name: "Fresas", quantityG: 80 },
      { name: "Arándanos", quantityG: 40 },
      { name: "Mantequilla de almendras", quantityG: 10 },
    ],
  },
  {
    name: "Omelette de espinaca y tomate con tostada de masa madre",
    ingredients: [
      { name: "Huevo entero", quantityG: 100 },
      { name: "Clara de huevo", quantityG: 66 },
      { name: "Espinaca fresca", quantityG: 40 },
      { name: "Tomate", quantityG: 60 },
      { name: "Queso mozzarella light", quantityG: 20 },
      { name: "Pan de masa madre", quantityG: 40 },
      { name: "Aceite de oliva", quantityG: 5 },
    ],
  },
  {
    name: "Huevos pericos con arepa y fruta fresca",
    ingredients: [
      { name: "Huevo entero", quantityG: 100 },
      { name: "Clara de huevo", quantityG: 66 },
      { name: "Tomate", quantityG: 60 },
      { name: "Cebolla", quantityG: 20 },
      { name: "Arepa de maíz", quantityG: 60 },
      { name: "Manzana", quantityG: 120 },
    ],
  },
  {
    name: "Omelette Caprese con pan de masa madre",
    ingredients: [
      { name: "Huevo entero", quantityG: 100 },
      { name: "Clara de huevo", quantityG: 66 },
      { name: "Tomate", quantityG: 60 },
      { name: "Queso mozzarella light", quantityG: 30 },
      { name: "Pan de masa madre", quantityG: 40 },
      { name: "Aceite de oliva", quantityG: 5 },
    ],
  },
  {
    name: "Sándwich caliente de huevo y pavo",
    ingredients: [
      { name: "Huevo entero", quantityG: 100 },
      { name: "Pan de masa madre", quantityG: 80 },
      { name: "Queso mozzarella light", quantityG: 30 },
      { name: "Pechuga de pavo (fiambre)", quantityG: 50 },
      { name: "Guacamole", quantityG: 20 },
      { name: "Arándanos", quantityG: 40 },
    ],
  },
  {
    name: "Burrito de desayuno",
    ingredients: [
      { name: "Tortilla integral", quantityG: 60 },
      { name: "Huevo entero", quantityG: 100 },
      { name: "Clara de huevo", quantityG: 66 },
      { name: "Queso mozzarella light", quantityG: 40 },
      { name: "Tomate", quantityG: 50 },
      { name: "Cebolla", quantityG: 20 },
      { name: "Guacamole", quantityG: 20 },
    ],
  },
  {
    name: "Batido de proteína con fruta y avena",
    ingredients: [
      { name: "Proteína vegetal en polvo", quantityG: 30 },
      { name: "Plátano", quantityG: 90 },
      { name: "Avena", quantityG: 20 },
    ],
  },
  {
    name: "Bowl Mexicano de Pollo",
    ingredients: [
      { name: "Pechuga de pollo", quantityG: 120 },
      { name: "Arroz blanco cocido", quantityG: 100 },
      { name: "Fríjoles negros cocidos", quantityG: 50 },
      { name: "Maíz dulce", quantityG: 40 },
      { name: "Tomate", quantityG: 60 },
      { name: "Pepino", quantityG: 60 },
      { name: "Pimentón rojo", quantityG: 40 },
      { name: "Guacamole", quantityG: 50 },
    ],
  },
  {
    name: "Sudado de carne con papa y habichuelas",
    ingredients: [
      { name: "Carne de res magra", quantityG: 120 },
      { name: "Papa criolla", quantityG: 150 },
      { name: "Habichuelas", quantityG: 80 },
      { name: "Tomate", quantityG: 80 },
      { name: "Cebolla", quantityG: 30 },
      { name: "Aceite de oliva", quantityG: 5 },
      { name: "Caldo de res bajo en sodio", quantityG: 250 },
    ],
  },
  {
    name: "Pasta cremosa de pollo",
    ingredients: [
      { name: "Pasta seca", quantityG: 75 },
      { name: "Pechuga de pollo", quantityG: 120 },
      { name: "Champiñones", quantityG: 80 },
      { name: "Espinaca fresca", quantityG: 60 },
      { name: "Leche evaporada descremada", quantityG: 60 },
      { name: "Aceite de oliva", quantityG: 5 },
      { name: "Queso parmesano rallado", quantityG: 15 },
    ],
  },
  {
    name: "Tacos saludables de carne",
    ingredients: [
      { name: "Carne de res magra", quantityG: 120 },
      { name: "Tortilla de maíz", quantityG: 75 },
      { name: "Guacamole", quantityG: 40 },
      { name: "Tomate", quantityG: 60 },
      { name: "Lechuga romana", quantityG: 40 },
    ],
  },
  {
    name: "Hamburguesa saludable con papas rústicas",
    ingredients: [
      { name: "Carne de res magra", quantityG: 130 },
      { name: "Pan integral para hamburguesa", quantityG: 50 },
      { name: "Queso mozzarella light", quantityG: 20 },
      { name: "Tomate", quantityG: 30 },
      { name: "Papa", quantityG: 180 },
      { name: "Aceite de oliva", quantityG: 5 },
    ],
  },
  {
    name: "Gyro de pollo con papas rústicas y salsa de yogur",
    ingredients: [
      { name: "Pechuga de pollo", quantityG: 130 },
      { name: "Papa", quantityG: 180 },
      { name: "Aceite de oliva", quantityG: 5 },
      { name: "Lechuga romana", quantityG: 30 },
      { name: "Tomate", quantityG: 30 },
      { name: "Pepino", quantityG: 30 },
      { name: "Yogur griego bajo en grasa", quantityG: 40 },
      { name: "Guacamole", quantityG: 35 },
    ],
  },
  {
    name: "Crema de ahuyama rostizada con pollo",
    ingredients: [
      { name: "Ahuyama", quantityG: 300 },
      { name: "Cebolla", quantityG: 30 },
      { name: "Aceite de oliva", quantityG: 5 },
      { name: "Caldo de pollo bajo en sodio", quantityG: 250 },
      { name: "Pechuga de pollo", quantityG: 120 },
      { name: "Queso parmesano rallado", quantityG: 10 },
    ],
  },
  {
    name: "Salmón con vegetales al horno",
    ingredients: [
      { name: "Salmón", quantityG: 120 },
      { name: "Brócoli", quantityG: 120 },
      { name: "Zanahoria", quantityG: 80 },
      { name: "Zucchini", quantityG: 80 },
      { name: "Aceite de oliva", quantityG: 5 },
    ],
  },
  {
    name: "Tilapia al limón con vegetales rostizados",
    ingredients: [
      { name: "Tilapia", quantityG: 140 },
      { name: "Brócoli", quantityG: 120 },
      { name: "Zanahoria", quantityG: 80 },
      { name: "Pimentón rojo", quantityG: 80 },
      { name: "Aceite de oliva", quantityG: 5 },
    ],
  },
  {
    name: "Pollo cremoso con champiñones y zucchini rostizado",
    ingredients: [
      { name: "Pechuga de pollo", quantityG: 140 },
      { name: "Champiñones", quantityG: 100 },
      { name: "Leche evaporada descremada", quantityG: 60 },
      { name: "Queso parmesano rallado", quantityG: 10 },
      { name: "Zucchini", quantityG: 180 },
      { name: "Aceite de oliva", quantityG: 5 },
    ],
  },
  {
    name: "Pizza de tortilla de maíz alta en proteína",
    ingredients: [
      { name: "Tortilla de maíz", quantityG: 50 },
      { name: "Pechuga de pollo", quantityG: 90 },
      { name: "Salsa de tomate natural", quantityG: 40 },
      { name: "Queso mozzarella light", quantityG: 40 },
      { name: "Champiñones", quantityG: 40 },
      { name: "Pimentón rojo", quantityG: 30 },
    ],
  },
  {
    name: "Crema de tomate rostizado con queso gratinado y pollo",
    ingredients: [
      { name: "Tomate", quantityG: 400 },
      { name: "Cebolla", quantityG: 60 },
      { name: "Caldo de pollo bajo en sodio", quantityG: 250 },
      { name: "Queso mozzarella light", quantityG: 20 },
      { name: "Pechuga de pollo", quantityG: 140 },
    ],
  },
  {
    name: "Batido pre/post-entreno",
    ingredients: [
      { name: "Proteína vegetal en polvo", quantityG: 30 },
      { name: "Creatina", quantityG: 5 },
    ],
  },
  {
    name: "Manzana con almendras",
    ingredients: [
      { name: "Manzana", quantityG: 130 },
      { name: "Almendras", quantityG: 12 },
    ],
  },
  {
    name: "Huevos cocidos con fruta",
    ingredients: [
      { name: "Huevo entero", quantityG: 75 },
      { name: "Piña", quantityG: 90 },
    ],
  },
  {
    name: "Piña con nueces",
    ingredients: [
      { name: "Piña", quantityG: 100 },
      { name: "Nueces", quantityG: 10 },
    ],
  },
  {
    name: "Fresas con yogur griego",
    ingredients: [
      { name: "Fresas", quantityG: 100 },
      { name: "Yogur griego bajo en grasa", quantityG: 100 },
    ],
  },
]

async function main() {
  const foodItemIdByName = new Map<string, string>()

  for (const ing of INGREDIENTS) {
    const existing = await prisma.foodItem.findFirst({ where: { name: ing.name, source: "seed_ingredient" } })
    const item =
      existing ??
      (await prisma.foodItem.create({
        data: {
          source: "seed_ingredient",
          name: ing.name,
          caloriesPer100g: ing.caloriesPer100g,
          proteinPer100g: ing.proteinPer100g,
          carbsPer100g: ing.carbsPer100g,
          fatPer100g: ing.fatPer100g,
          fiberPer100g: ing.fiberPer100g ?? null,
          isVerified: true,
        },
      }))
    foodItemIdByName.set(ing.name, item.id)
  }

  let created = 0
  let skipped = 0
  for (const r of RECIPES) {
    const existingRecipe = await prisma.recipe.findFirst({ where: { name: r.name, isGlobal: true } })
    if (existingRecipe) {
      skipped++
      continue
    }
    const finalWeightG = r.ingredients.reduce((s, i) => s + i.quantityG, 0)
    await prisma.recipe.create({
      data: {
        userId: null,
        isGlobal: true,
        name: r.name,
        servings: 1,
        finalWeightG,
        ingredients: {
          create: r.ingredients.map((i) => {
            const foodItemId = foodItemIdByName.get(i.name)
            if (!foodItemId) throw new Error(`Missing ingredient "${i.name}" for recipe "${r.name}"`)
            return { foodItemId, quantityG: i.quantityG, weightState: "raw" as const }
          }),
        },
      },
    })
    created++
  }

  console.log(`Seeded ${INGREDIENTS.length} ingredients. Recipes: ${created} created, ${skipped} already existed.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
