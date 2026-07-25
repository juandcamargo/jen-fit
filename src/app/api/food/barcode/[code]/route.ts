import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getFoodProvider } from "@/lib/food/provider"
import { upsertNormalizedFood, findFreshCachedByBarcode } from "@/lib/food/cache"

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  }

  const { code } = await context.params

  const cached = await findFreshCachedByBarcode(code)
  if (cached) {
    return NextResponse.json({ result: cached })
  }

  try {
    const provider = getFoodProvider()
    const normalized = await provider.getByBarcode(code)
    if (!normalized) {
      return NextResponse.json({ result: null, message: "No encontramos este producto. Puedes crearlo manualmente." })
    }
    const saved = await upsertNormalizedFood(normalized)
    return NextResponse.json({ result: saved })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo consultar la fuente externa." },
      { status: 502 }
    )
  }
}
