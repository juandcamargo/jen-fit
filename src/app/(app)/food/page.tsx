import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { startOfDay, endOfDay, dateKey } from "@/lib/date";
import { FoodDayClient } from "./FoodDayClient";

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { session } = await requireOnboardedUser();
  const { date: dateParam } = await searchParams;
  const selectedDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);

  const [entries, summary, keySupplements] = await Promise.all([
    prisma.foodEntry.findMany({
      where: { userId: session.user.id, date: { gte: dayStart, lte: dayEnd } },
      include: { foodItem: true, recipe: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dailySummary.findUnique({ where: { userId_date: { userId: session.user.id, date: dayStart } } }),
    prisma.supplement.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        OR: [{ proteinType: "collagen" }, { isCreatine: true }],
      },
      include: { logs: { where: { date: { gte: dayStart, lte: dayEnd } } } },
    }),
  ]);

  return (
    <FoodDayClient
      key={dateKey(dayStart)}
      entries={entries}
      summary={summary}
      dateKey={dateKey(dayStart)}
      isToday={dateKey(dayStart) === dateKey(new Date())}
      keySupplements={keySupplements.map((s) => ({
        id: s.id,
        name: s.name,
        dose: s.dose,
        unit: s.unit,
        isCreatine: s.isCreatine,
        proteinType: s.proteinType,
        takenToday: s.logs.some((l) => l.taken),
      }))}
    />
  );
}
