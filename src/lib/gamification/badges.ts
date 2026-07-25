import { prisma } from "@/lib/prisma"

/**
 * Evaluates every badge condition for a user and unlocks any newly earned
 * ones. Idempotent — already-unlocked badges are skipped via the unique
 * (userId, badgeId) constraint.
 */
export async function evaluateAndUnlockBadges(userId: string): Promise<string[]> {
  const [
    loggingStreak,
    waterStreak,
    trainingStreak,
    proteinDaySummaries,
    completedWorkoutsCount,
    recipesCount,
    firstDailySummary,
    daysSinceStart,
    strengthSets,
    creatineStreakDays,
  ] = await Promise.all([
    prisma.streak.findUnique({ where: { userId_type: { userId, type: "logging" } } }),
    prisma.streak.findUnique({ where: { userId_type: { userId, type: "water" } } }),
    prisma.streak.findUnique({ where: { userId_type: { userId, type: "training" } } }),
    prisma.dailySummary.findMany({
      where: { userId, proteinGoal: { gt: 0 } },
      select: { proteinConsumed: true, proteinGoal: true },
    }),
    prisma.strengthWorkout.count({ where: { userId, completed: true } }),
    prisma.recipe.count({ where: { userId } }),
    prisma.dailySummary.findFirst({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.dailySummary.count({ where: { userId } }),
    prisma.strengthSet.findMany({
      where: { workout: { userId } },
      orderBy: { id: "asc" },
      select: { exerciseName: true, weightKg: true, workout: { select: { date: true } } },
      take: 500,
    }),
    prisma.supplementLog.findMany({
      where: { userId, taken: true, supplement: { isCreatine: true } },
      orderBy: { date: "desc" },
      take: 14,
      select: { date: true },
    }),
  ])

  const proteinDaysMet = proteinDaySummaries.filter((d) => d.proteinConsumed >= d.proteinGoal).length

  const cardioCompletedCount = await prisma.cardioSession.count({ where: { userId } })
  const totalWorkouts = completedWorkoutsCount + cardioCompletedCount

  const earned = new Set<string>()

  if (daysSinceStart >= 7) earned.add("first_week")
  if ((loggingStreak?.currentStreak ?? 0) >= 3) earned.add("three_day_logger")
  if ((waterStreak?.currentStreak ?? 0) >= 7) earned.add("seven_day_water")
  if (proteinDaysMet > 0) earned.add("protein_goal")
  if (totalWorkouts >= 5) earned.add("five_workouts")
  if (recipesCount >= 1) earned.add("first_recipe")
  if (firstDailySummary && daysSinceStart >= 30) earned.add("first_month")
  if ((loggingStreak?.currentStreak ?? 0) >= 14 || (loggingStreak?.longestStreak ?? 0) >= 14) earned.add("streak_14")
  if ((loggingStreak?.currentStreak ?? 0) >= 30 || (loggingStreak?.longestStreak ?? 0) >= 30) earned.add("streak_30")
  if ((trainingStreak?.longestStreak ?? 0) >= 3) earned.add("better_rest")

  // "stronger": any exercise where a later session used more weight than an earlier one.
  const byExercise = new Map<string, number[]>()
  for (const set of strengthSets) {
    if (set.weightKg == null) continue
    const list = byExercise.get(set.exerciseName) ?? []
    list.push(set.weightKg)
    byExercise.set(set.exerciseName, list)
  }
  for (const weights of byExercise.values()) {
    if (weights.length >= 2 && weights[weights.length - 1] > weights[0]) {
      earned.add("stronger")
      break
    }
  }

  // 7 consecutive days of creatine within the last 14 logs.
  const creatineDates = new Set(creatineStreakDays.map((l) => l.date.toDateString()))
  if (creatineDates.size >= 7) earned.add("creatine_consistency")

  if (earned.size === 0) return []

  const badgeRows = await prisma.badge.findMany({ where: { code: { in: Array.from(earned) } } })
  const alreadyUnlocked = await prisma.userBadge.findMany({
    where: { userId, badgeId: { in: badgeRows.map((b) => b.id) } },
    select: { badgeId: true },
  })
  const alreadyUnlockedIds = new Set(alreadyUnlocked.map((u) => u.badgeId))
  const newBadgeRows = badgeRows.filter((b) => !alreadyUnlockedIds.has(b.id))
  if (newBadgeRows.length === 0) return []

  // Per-row upsert (not createMany+skipDuplicates) for SQLite compatibility.
  await Promise.all(
    newBadgeRows.map((b) =>
      prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: b.id } },
        create: { userId, badgeId: b.id },
        update: {},
      })
    )
  )

  return newBadgeRows.map((b) => b.code)
}
