import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getFoodProvider } from "@/lib/food/provider"
import { upsertNormalizedFood } from "@/lib/food/cache"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim() ?? ""
  const page = Number(searchParams.get("page") ?? "1")

  if (query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // 1. Local cache / manual / verified foods first — instant and offline-friendly.
  const localMatches = await prisma.foodItem.findMany({
    where: { name: { contains: query } },
    take: 20,
    orderBy: [{ isVerified: "desc" }, { updatedAt: "desc" }],
  })

  // 2. Open Food Facts (or whichever provider is configured) for anything new.
  let providerError: string | null = null
  let saved: Awaited<ReturnType<typeof upsertNormalizedFood>>[] = []
  try {
    const provider = getFoodProvider()
    const results = await provider.searchByName(query, page)
    saved = await Promise.all(results.map(upsertNormalizedFood))
  } catch (error) {
    providerError = error instanceof Error ? error.message : "No se pudo consultar la fuente externa."
  }

  const byId = new Map(localMatches.map((f) => [f.id, f]))
  for (const item of saved) byId.set(item.id, item)

  return NextResponse.json({
    results: Array.from(byId.values()),
    providerError,
  })
}
