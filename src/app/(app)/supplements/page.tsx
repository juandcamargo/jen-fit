import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { startOfDay, endOfDay } from "@/lib/date";
import { SupplementsClient } from "./SupplementsClient";

export default async function SupplementsPage() {
  const { session } = await requireOnboardedUser();
  const today = startOfDay(new Date());

  const supplements = await prisma.supplement.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "asc" },
    include: { logs: { where: { date: { gte: today, lte: endOfDay(today) } } } },
  });

  const initial = supplements.map((s) => ({
    id: s.id,
    name: s.name,
    dose: s.dose,
    unit: s.unit,
    recommendedTime: s.recommendedTime,
    proteinType: s.proteinType,
    isCreatine: s.isCreatine,
    calories: s.calories,
    proteinG: s.proteinG,
    takenToday: s.logs.some((l) => l.taken),
  }));

  return <SupplementsClient initialSupplements={initial} />;
}
