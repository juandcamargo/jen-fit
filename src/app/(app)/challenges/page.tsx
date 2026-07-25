import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { syncAllActiveChallenges } from "@/lib/gamification/challengeProgress";
import { ChallengesClient } from "./ChallengesClient";

export default async function ChallengesPage() {
  const { session } = await requireOnboardedUser();
  await syncAllActiveChallenges(session.user.id);

  const [challenges, userChallenges] = await Promise.all([
    prisma.challenge.findMany(),
    prisma.userChallenge.findMany({ where: { userId: session.user.id }, include: { challenge: true } }),
  ]);

  const activeByChallenge = new Map(userChallenges.filter((uc) => !uc.completed).map((uc) => [uc.challengeId, uc]));
  const completedCount = userChallenges.filter((uc) => uc.completed).length;

  return (
    <ChallengesClient
      challenges={challenges}
      activeMap={Object.fromEntries(activeByChallenge)}
      completedCount={completedCount}
    />
  );
}
