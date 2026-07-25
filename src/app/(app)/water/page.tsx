import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { startOfDay, endOfDay } from "@/lib/date";
import { WaterClient } from "./WaterClient";

export default async function WaterPage() {
  const { session, profile } = await requireOnboardedUser();
  const today = startOfDay(new Date());

  const [logs, settings, streak] = await Promise.all([
    prisma.waterLog.findMany({
      where: { userId: session.user.id, date: { gte: today, lte: endOfDay(today) } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.waterSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.streak.findUnique({ where: { userId_type: { userId: session.user.id, type: "water" } } }),
  ]);

  return (
    <WaterClient
      logs={logs.map((l) => ({ id: l.id, amountMl: l.amountMl, createdAt: l.createdAt.toISOString() }))}
      goalMl={settings?.dailyGoalMl ?? profile!.waterGoalMl}
      settings={settings}
      streak={streak?.currentStreak ?? 0}
    />
  );
}
