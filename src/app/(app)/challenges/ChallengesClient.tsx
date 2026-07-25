"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/icons/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";

interface Challenge {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  goalValue: number;
  durationDays: number;
}

interface ActiveUserChallenge {
  id: string;
  progress: number;
  completed: boolean;
}

export function ChallengesClient({
  challenges,
  activeMap,
  completedCount,
}: {
  challenges: Challenge[];
  activeMap: Record<string, ActiveUserChallenge>;
  completedCount: number;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function start(challengeId: string) {
    setLoadingId(challengeId);
    await fetch("/api/challenges/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId }),
    });
    setLoadingId(null);
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Retos</h1>
        <span className="text-xs text-[var(--color-text-muted)]">{completedCount} completados</span>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Retos suaves para construir constancia — no para exigirte al extremo.
      </p>

      <div className="flex flex-col gap-3">
        {challenges.map((c) => {
          const active = activeMap[c.id];
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--color-plum-soft)] text-[var(--color-plum-strong)] flex items-center justify-center shrink-0">
                  <Icon name={c.icon as IconName} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{c.description}</p>

                  {active ? (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>
                          {active.progress}/{c.goalValue}
                        </span>
                        {active.completed && <span className="text-[var(--color-mint)]">¡Completado!</span>}
                      </div>
                      <ProgressBar percent={(active.progress / c.goalValue) * 100} heightPx={6} />
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3"
                      loading={loadingId === c.id}
                      onClick={() => start(c.id)}
                    >
                      Comenzar reto
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
