import { prisma } from "@/lib/prisma"
import { levelForPoints } from "./catalog"

/** Recomputes a user's total Fit Points (sum of every day's earned points) and level. */
export async function syncTotalFitPoints(userId: string): Promise<{ totalPoints: number; level: number; leveledUp: boolean }> {
  const [{ _sum }, profile] = await Promise.all([
    prisma.dailySummary.aggregate({ where: { userId }, _sum: { fitPointsEarned: true } }),
    prisma.profile.findUnique({ where: { userId } }),
  ])

  const totalPoints = _sum.fitPointsEarned ?? 0
  const newLevel = levelForPoints(totalPoints).level
  const leveledUp = !!profile && newLevel > profile.level

  await prisma.profile.update({
    where: { userId },
    data: { totalFitPoints: totalPoints, level: newLevel },
  })

  return { totalPoints, level: newLevel, leveledUp }
}
