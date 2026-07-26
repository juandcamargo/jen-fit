import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { addDays, startOfDay } from "@/lib/date";
import { ProgressClient } from "./ProgressClient";

export default async function ProgressPage() {
  const { session, profile } = await requireOnboardedUser();
  const today = startOfDay(new Date());
  const yearAgo = addDays(today, -365);

  const [measurements, summaries] = await Promise.all([
    prisma.bodyMeasurement.findMany({
      where: { userId: session.user.id, date: { gte: yearAgo } },
      orderBy: { date: "asc" },
    }),
    prisma.dailySummary.findMany({
      where: { userId: session.user.id, date: { gte: yearAgo } },
      orderBy: { date: "asc" },
    }),
  ]);

  return (
    <ProgressClient
      measurements={measurements.map((m) => ({
        date: m.date.toISOString(),
        waistCm: m.waistCm,
        bodyFatPercent: m.bodyFatPercent,
      }))}
      summaries={summaries.map((s) => ({
        date: s.date.toISOString(),
        deficitOrSurplus: s.deficitOrSurplus,
        caloriesConsumed: s.caloriesConsumed,
        caloriesGoal: s.caloriesGoal,
        proteinConsumed: s.proteinConsumed,
        proteinGoal: s.proteinGoal,
        waterConsumedMl: s.waterConsumedMl,
        waterGoalMl: s.waterGoalMl,
      }))}
      targetBodyFatPercent={profile!.targetBodyFatPercent}
      tdeeConfidence={profile!.tdeeConfidence}
      calculatedTdee={profile!.calculatedTdee}
      tdeeLastCalibratedAt={profile!.tdeeLastCalibratedAt?.toISOString() ?? null}
    />
  );
}
