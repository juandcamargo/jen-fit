import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticada." }, { status: 401 })
  }
  const userId = session.user.id

  const [
    user,
    profile,
    weightLogs,
    bodyMeasurements,
    foodEntries,
    recipes,
    waterLogs,
    waterSettings,
    supplements,
    supplementLogs,
    strengthWorkouts,
    cardioSessions,
    dailySummaries,
    fitPointsLogs,
    streaks,
    userBadges,
    userChallenges,
    cycleLogs,
    notificationSettings,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, createdAt: true } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.weightLog.findMany({ where: { userId } }),
    prisma.bodyMeasurement.findMany({ where: { userId } }),
    prisma.foodEntry.findMany({ where: { userId } }),
    prisma.recipe.findMany({ where: { userId }, include: { ingredients: true } }),
    prisma.waterLog.findMany({ where: { userId } }),
    prisma.waterSettings.findUnique({ where: { userId } }),
    prisma.supplement.findMany({ where: { userId } }),
    prisma.supplementLog.findMany({ where: { userId } }),
    prisma.strengthWorkout.findMany({ where: { userId }, include: { sets: true } }),
    prisma.cardioSession.findMany({ where: { userId } }),
    prisma.dailySummary.findMany({ where: { userId } }),
    prisma.fitPointsLog.findMany({ where: { userId } }),
    prisma.streak.findMany({ where: { userId } }),
    prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
    prisma.userChallenge.findMany({ where: { userId }, include: { challenge: true } }),
    prisma.cycleLog.findMany({ where: { userId } }),
    prisma.notificationSetting.findMany({ where: { userId } }),
  ])

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    user,
    profile,
    weightLogs,
    bodyMeasurements,
    foodEntries,
    recipes,
    waterLogs,
    waterSettings,
    supplements,
    supplementLogs,
    strengthWorkouts,
    cardioSessions,
    dailySummaries,
    fitPointsLogs,
    streaks,
    userBadges,
    userChallenges,
    cycleLogs,
    notificationSettings,
  }

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="jen-fit-export-${userId}.json"`,
    },
  })
}
