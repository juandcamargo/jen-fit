import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createRecipeSchema } from "@/lib/validation/recipe"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const recipes = await prisma.recipe.findMany({
    where: {
      OR: [{ userId: session.user.id }, { isGlobal: true, hiddenBy: { none: { userId: session.user.id } } }],
    },
    include: { ingredients: { include: { foodItem: true } } },
    orderBy: [{ isGlobal: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json({ recipes })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = createRecipeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }
  const input = parsed.data

  const finalWeightG = input.ingredients.reduce((sum, i) => sum + i.quantityG, 0)

  const recipe = await prisma.recipe.create({
    data: {
      userId: session.user.id,
      name: input.name,
      servings: input.servings,
      notes: input.notes,
      finalWeightG,
      ingredients: {
        create: input.ingredients.map((i) => ({
          foodItemId: i.foodItemId,
          quantityG: i.quantityG,
          weightState: i.weightState,
        })),
      },
    },
    include: { ingredients: { include: { foodItem: true } } },
  })

  return NextResponse.json({ recipe })
}
