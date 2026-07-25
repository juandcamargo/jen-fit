import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const { session, profile } = await requireOnboardedUser();
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });

  return (
    <ProfileClient
      email={user!.email}
      name={profile!.name}
      targetWeightKg={profile!.targetWeightKg}
      activityLevel={profile!.activityLevel}
      avgDailySteps={profile!.avgDailySteps}
      trainingDaysPerWeek={profile!.trainingDaysPerWeek}
      proteinFactor={profile!.proteinFactor}
      waterGoalMl={profile!.waterGoalMl}
      deficitPreference={profile!.deficitPreference}
      calculatedBmr={profile!.calculatedBmr}
      calculatedTdee={profile!.calculatedTdee}
    />
  );
}
