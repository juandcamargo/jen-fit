import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { startOfDay } from "@/lib/date";
import { FoodDayClient } from "./FoodDayClient";

export default async function FoodPage() {
  const { session } = await requireOnboardedUser();
  const today = startOfDay(new Date());

  const [entries, summary] = await Promise.all([
    prisma.foodEntry.findMany({
      where: { userId: session.user.id, date: { gte: today } },
      include: { foodItem: true, recipe: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dailySummary.findUnique({ where: { userId_date: { userId: session.user.id, date: today } } }),
  ]);

  return <FoodDayClient entries={entries} summary={summary} />;
}
