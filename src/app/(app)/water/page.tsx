import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { startOfDay, endOfDay, dateKey } from "@/lib/date";
import { WaterClient } from "./WaterClient";

export default async function WaterPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { session, profile } = await requireOnboardedUser();
  const { date: dateParam } = await searchParams;
  const selectedDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);

  const [logs, settings, streak] = await Promise.all([
    prisma.waterLog.findMany({
      where: { userId: session.user.id, date: { gte: dayStart, lte: dayEnd } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.waterSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.streak.findUnique({ where: { userId_type: { userId: session.user.id, type: "water" } } }),
  ]);

  return (
    <WaterClient
      key={dateKey(dayStart)}
      logs={logs.map((l) => ({ id: l.id, amountMl: l.amountMl, createdAt: l.createdAt.toISOString() }))}
      goalMl={settings?.dailyGoalMl ?? profile!.waterGoalMl}
      settings={settings}
      streak={streak?.currentStreak ?? 0}
      dateKey={dateKey(dayStart)}
      isToday={dateKey(dayStart) === dateKey(new Date())}
    />
  );
}
