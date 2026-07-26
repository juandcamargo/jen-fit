import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteAccountSchema } from "@/lib/validation/auth"

/**
 * Wipes all tracked activity/history for a user while keeping their account
 * and configured goals intact (spec: "botón de resetear datos"). Requires a
 * password confirmation, same bar as deleting the account, since it's just
 * as destructive to the data even if the login survives.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  const userId = session.user.id

  const body = await request.json().catch(() => null)
  const parsed = deleteAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: "No autenticada." }, { status: 401 })

  const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!isValid) return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 403 })

  await prisma.$transaction([
    prisma.foodEntry.deleteMany({ where: { userId } }),
    prisma.recipeIngredient.deleteMany({ where: { recipe: { userId } } }),
    prisma.recipe.deleteMany({ where: { userId } }),
    prisma.favoriteFood.deleteMany({ where: { userId } }),
    prisma.waterLog.deleteMany({ where: { userId } }),
    prisma.supplementLog.deleteMany({ where: { userId } }),
    prisma.strengthSet.deleteMany({ where: { workout: { userId } } }),
    prisma.strengthWorkout.deleteMany({ where: { userId } }),
    prisma.cardioSession.deleteMany({ where: { userId } }),
    prisma.weightLog.deleteMany({ where: { userId } }),
    prisma.bodyMeasurement.deleteMany({ where: { userId } }),
    prisma.dailySummary.deleteMany({ where: { userId } }),
    prisma.fitPointsLog.deleteMany({ where: { userId } }),
    prisma.userBadge.deleteMany({ where: { userId } }),
    prisma.userChallenge.deleteMany({ where: { userId } }),
    prisma.cycleLog.deleteMany({ where: { userId } }),
    prisma.tdeeCalibration.deleteMany({ where: { userId } }),
    prisma.streak.updateMany({ where: { userId }, data: { currentStreak: 0, longestStreak: 0, lastActiveDate: null } }),
    prisma.profile.update({
      where: { userId },
      data: {
        bodyFatPercent: null,
        waistCm: null,
        hipCm: null,
        neckCm: null,
        lastMeasuredAt: null,
        totalFitPoints: 0,
        level: 1,
      },
    }),
  ])

  return NextResponse.json({ ok: true })
}
