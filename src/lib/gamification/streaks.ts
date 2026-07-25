import { prisma } from "@/lib/prisma"
import { isSameDay, addDays, startOfDay } from "@/lib/date"

export type StreakType = "logging" | "water" | "training"

/**
 * Updates a streak for `date`. Safe to call multiple times for the same day
 * (idempotent) and safe to call out of order for past days within reason —
 * if `date` isn't the day right after `lastActiveDate`, the streak resets.
 */
export async function updateStreak(userId: string, type: StreakType, date: Date, achievedToday: boolean) {
  const day = startOfDay(date)
  const streak = await prisma.streak.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, currentStreak: 0, longestStreak: 0 },
    update: {},
  })

  if (!achievedToday) {
    // Only breaks the streak if the missed day is today or in the past
    // relative to the streak's last known day — don't retroactively break a
    // streak because of a still-open future day.
    if (streak.lastActiveDate && day.getTime() > streak.lastActiveDate.getTime()) {
      return prisma.streak.update({ where: { id: streak.id }, data: { currentStreak: 0 } })
    }
    return streak
  }

  if (streak.lastActiveDate && isSameDay(streak.lastActiveDate, day)) {
    return streak // already counted today
  }

  const isConsecutive = streak.lastActiveDate && isSameDay(addDays(streak.lastActiveDate, 1), day)
  const newCurrent = isConsecutive ? streak.currentStreak + 1 : 1

  return prisma.streak.update({
    where: { id: streak.id },
    data: {
      currentStreak: newCurrent,
      longestStreak: Math.max(streak.longestStreak, newCurrent),
      lastActiveDate: day,
    },
  })
}
