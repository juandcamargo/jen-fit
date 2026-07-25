import { prisma } from "@/lib/prisma"
import { endOfDay } from "@/lib/date"

/**
 * The user's current weight is ALWAYS the latest logged WeightLog on or
 * before the given date — never a fixed/default value stored on Profile.
 * BMR, TDEE, protein goals and exercise calorie estimates all read through
 * this so they stay correct as weight changes (spec section 4).
 */
export async function getWeightAtDate(userId: string, date: Date): Promise<number | null> {
  const log = await prisma.weightLog.findFirst({
    where: { userId, date: { lte: endOfDay(date) } },
    orderBy: { date: "desc" },
  })
  return log?.weightKg ?? null
}
