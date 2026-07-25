import { prisma } from "@/lib/prisma"

/**
 * Computes and persists progress for a single active UserChallenge, based on
 * its goalType (spec section 26). Called on page load — cheap enough for a
 * personal app, and keeps progress always fresh without a background job.
 */
export async function syncChallengeProgress(userChallengeId: string): Promise<{ progress: number; completed: boolean }> {
  const uc = await prisma.userChallenge.findUnique({
    where: { id: userChallengeId },
    include: { challenge: true },
  })
  if (!uc || uc.completed) return { progress: uc?.progress ?? 0, completed: uc?.completed ?? false }

  const since = uc.startedAt
  let progress = 0

  switch (uc.challenge.goalType) {
    case "log_breakfast": {
      const rows = await prisma.foodEntry.findMany({
        where: { userId: uc.userId, mealType: "breakfast", date: { gte: since } },
        select: { date: true },
      })
      progress = new Set(rows.map((r) => r.date.toDateString())).size
      break
    }
    case "protein_goal": {
      const days = await prisma.dailySummary.findMany({
        where: { userId: uc.userId, date: { gte: since } },
        select: { proteinConsumed: true, proteinGoal: true },
      })
      progress = days.filter((d) => d.proteinConsumed >= d.proteinGoal).length
      break
    }
    case "water_days": {
      const days = await prisma.dailySummary.findMany({
        where: { userId: uc.userId, date: { gte: since } },
        select: { waterConsumedMl: true, waterGoalMl: true },
      })
      progress = days.filter((d) => d.waterGoalMl > 0 && d.waterConsumedMl >= d.waterGoalMl).length
      break
    }
    case "workouts": {
      const [strength, cardio] = await Promise.all([
        prisma.strengthWorkout.count({ where: { userId: uc.userId, date: { gte: since }, completed: true } }),
        prisma.cardioSession.count({ where: { userId: uc.userId, date: { gte: since } } }),
      ])
      progress = strength + cardio
      break
    }
    case "home_meal": {
      progress = await prisma.foodEntry.count({
        where: { userId: uc.userId, date: { gte: since }, isCustomEntry: true },
      })
      break
    }
    case "supplements": {
      const rows = await prisma.supplementLog.findMany({
        where: { userId: uc.userId, date: { gte: since }, taken: true },
        select: { date: true },
      })
      progress = new Set(rows.map((r) => r.date.toDateString())).size
      break
    }
    case "steps": {
      // No dedicated steps log yet — left as a manual/future metric.
      progress = uc.progress
      break
    }
  }

  const completed = progress >= uc.challenge.goalValue
  await prisma.userChallenge.update({
    where: { id: uc.id },
    data: { progress, completed, completedAt: completed ? new Date() : null },
  })

  return { progress, completed }
}

export async function syncAllActiveChallenges(userId: string) {
  const active = await prisma.userChallenge.findMany({ where: { userId, completed: false } })
  await Promise.all(active.map((uc) => syncChallengeProgress(uc.id)))
}
