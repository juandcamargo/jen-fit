import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { getWeightAtDate } from "@/lib/weight";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const { session, profile } = await requireOnboardedUser();
  const [user, currentWeightKg] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } }),
    getWeightAtDate(session.user.id, new Date()),
  ]);

  return (
    <ProfileClient
      email={user!.email}
      name={profile!.name}
      currentWeightKg={currentWeightKg}
      heightCm={profile!.heightCm}
      birthDate={profile!.birthDate?.toISOString().slice(0, 10) ?? null}
      bodyFatPercent={profile!.bodyFatPercent}
      targetBodyFatPercent={profile!.targetBodyFatPercent}
      waistCm={profile!.waistCm}
      hipCm={profile!.hipCm}
      neckCm={profile!.neckCm}
      lastMeasuredAt={profile!.lastMeasuredAt?.toISOString() ?? null}
      activityLevel={profile!.activityLevel}
      avgDailySteps={profile!.avgDailySteps}
      trainingDaysPerWeek={profile!.trainingDaysPerWeek}
      pace={profile!.pace}
      proteinFactor={profile!.proteinFactor}
      waterGoalMl={profile!.waterGoalMl}
      calculatedBmr={profile!.calculatedBmr}
      calculatedTdee={profile!.calculatedTdee}
    />
  );
}
