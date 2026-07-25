import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { levelForPoints } from "@/lib/gamification/catalog";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, profile } = await requireOnboardedUser();

  const loggingStreak = await prisma.streak.findUnique({
    where: { userId_type: { userId: session.user.id, type: "logging" } },
  });

  const levelInfo = levelForPoints(profile!.totalFitPoints);

  return (
    <AppShell
      userName={profile!.name}
      level={profile!.level}
      levelName={levelInfo.name}
      fitPoints={profile!.totalFitPoints}
      loggingStreak={loggingStreak?.currentStreak ?? 0}
    >
      {children}
    </AppShell>
  );
}
