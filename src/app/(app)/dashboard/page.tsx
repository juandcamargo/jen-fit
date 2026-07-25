import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { recomputeDailySummary } from "@/lib/dailySummary";
import { startOfDay, addDays } from "@/lib/date";
import { levelForPoints, nextLevel } from "@/lib/gamification/catalog";
import { summarizeWeeklyBalance } from "@/lib/calculations";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const { session, profile } = await requireOnboardedUser();
  const userId = session.user.id;
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  const weekAgo = addDays(today, -6);

  await recomputeDailySummary(userId, today);

  const [todaySummary, yesterdaySummary, weekSummaries, foodEntriesToday, streaks, recentBadges, activeChallenges] =
    await Promise.all([
      prisma.dailySummary.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.dailySummary.findUnique({ where: { userId_date: { userId, date: yesterday } } }),
      prisma.dailySummary.findMany({ where: { userId, date: { gte: weekAgo, lte: today } }, orderBy: { date: "asc" } }),
      prisma.foodEntry.findMany({
        where: { userId, date: { gte: today } },
        orderBy: { createdAt: "asc" },
        include: { foodItem: true, recipe: true },
      }),
      prisma.streak.findMany({ where: { userId } }),
      prisma.userBadge.findMany({ where: { userId }, orderBy: { unlockedAt: "desc" }, take: 3, include: { badge: true } }),
      prisma.userChallenge.findMany({ where: { userId, completed: false }, include: { challenge: true }, take: 3 }),
    ]);

  const levelInfo = levelForPoints(profile!.totalFitPoints);
  const upcomingLevel = nextLevel(profile!.totalFitPoints);
  const weekly = summarizeWeeklyBalance(
    weekSummaries.map((d) => ({
      deficitOrSurplus: d.deficitOrSurplus,
      proteinConsumed: d.proteinConsumed,
      proteinGoal: d.proteinGoal,
      waterConsumedMl: d.waterConsumedMl,
      waterGoalMl: d.waterGoalMl,
    }))
  );

  return (
    <DashboardClient
      name={profile!.name}
      level={levelInfo}
      upcomingLevel={upcomingLevel}
      totalFitPoints={profile!.totalFitPoints}
      today={todaySummary}
      yesterday={yesterdaySummary}
      weekly={weekly}
      foodEntriesToday={foodEntriesToday}
      loggingStreak={streaks.find((s) => s.type === "logging")?.currentStreak ?? 0}
      waterStreak={streaks.find((s) => s.type === "water")?.currentStreak ?? 0}
      recentBadges={recentBadges.map((b) => b.badge)}
      activeChallenges={activeChallenges}
    />
  );
}
