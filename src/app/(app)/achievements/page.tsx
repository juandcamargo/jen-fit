import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { levelForPoints, nextLevel, LEVELS } from "@/lib/gamification/catalog";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/icons/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default async function AchievementsPage() {
  const { session, profile } = await requireOnboardedUser();

  const [badges, userBadges] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId: session.user.id } }),
  ]);
  const unlockedIds = new Set(userBadges.map((u) => u.badgeId));

  const level = levelForPoints(profile!.totalFitPoints);
  const upcoming = nextLevel(profile!.totalFitPoints);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <h1 className="font-display text-2xl">Tus logros</h1>

      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color-plum)] text-white flex items-center justify-center">
            <Icon name="crown" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              Nivel {level.level} · {level.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{profile!.totalFitPoints} Fit Points</p>
          </div>
        </div>
        {upcoming && (
          <ProgressBar percent={((profile!.totalFitPoints - level.minPoints) / (upcoming.minPoints - level.minPoints)) * 100} />
        )}

        <div className="grid grid-cols-7 gap-1 mt-4">
          {LEVELS.map((l) => (
            <div key={l.level} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                  profile!.level >= l.level
                    ? "bg-[var(--color-plum)] text-white"
                    : "bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]"
                }`}
              >
                {l.level}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.map((b) => {
          const unlocked = unlockedIds.has(b.id);
          return (
            <Card key={b.id} className={`p-4 flex flex-col items-center text-center gap-2 ${!unlocked ? "opacity-45" : ""}`}>
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-lg ${
                  unlocked ? "bg-[var(--color-plum)] text-white" : "bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]"
                }`}
              >
                <Icon name={b.icon as IconName} />
              </div>
              <p className="text-xs font-medium">{b.name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{b.description}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
