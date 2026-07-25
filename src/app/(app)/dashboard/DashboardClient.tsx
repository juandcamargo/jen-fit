"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { celebrate } from "@/lib/celebrate";
import { balanceMessage, proteinMessage, waterMessage, workoutMessage, yesterdayGreeting } from "@/lib/motivation";

interface SummaryLike {
  caloriesConsumed: number;
  caloriesGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  proteinCollagen: number;
  carbsConsumed: number;
  fatConsumed: number;
  waterConsumedMl: number;
  waterGoalMl: number;
  exerciseCalories: number;
  expectedExpenditure: number;
  deficitOrSurplus: number;
  diffFromGoal: number;
  fitPointsEarned: number;
}

interface FoodEntryLike {
  id: string;
  mealType: string;
  customName: string | null;
  calories: number;
  protein: number;
  quantityG: number;
  foodItem: { name: string } | null;
  recipe: { name: string } | null;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Desayuno",
  mid_morning: "Media mañana",
  lunch: "Almuerzo",
  snack: "Merienda",
  dinner: "Cena",
  snacks: "Snacks",
  drinks: "Bebidas",
  supplements: "Suplementos",
};

const MEAL_ORDER = ["breakfast", "mid_morning", "lunch", "snack", "dinner", "snacks", "drinks", "supplements"];

const WATER_QUICK_ADDS = [250, 350, 500];

export function DashboardClient({
  name,
  level,
  upcomingLevel,
  totalFitPoints,
  today,
  yesterday,
  weekly,
  foodEntriesToday,
  loggingStreak,
  waterStreak,
  recentBadges,
  activeChallenges,
}: {
  name: string;
  level: { level: number; name: string; minPoints: number };
  upcomingLevel: { level: number; name: string; minPoints: number } | null;
  totalFitPoints: number;
  today: SummaryLike | null;
  yesterday: SummaryLike | null;
  weekly: {
    totalWeeklyDeficit: number;
    avgDailyDeficit: number;
    daysInDeficit: number;
    daysNearMaintenance: number;
    daysInSurplus: number;
    avgProteinPercent: number;
    avgWaterPercent: number;
  };
  foodEntriesToday: FoodEntryLike[];
  loggingStreak: number;
  waterStreak: number;
  recentBadges: { id: string; name: string; icon: string }[];
  activeChallenges: { id: string; progress: number; challenge: { title: string; icon: string; goalValue: number } }[];
}) {
  const [showMorning, setShowMorning] = useState(false);
  const [waterMl, setWaterMl] = useState(today?.waterConsumedMl ?? 0);
  const [waterLoading, setWaterLoading] = useState<number | null>(null);

  useEffect(() => {
    const todayKey = new Date().toDateString();
    const seenKey = "jenfit-morning-seen";
    const lastSeen = localStorage.getItem(seenKey);
    if (lastSeen !== todayKey) {
      setShowMorning(true);
      localStorage.setItem(seenKey, todayKey);
    }
  }, []);

  const day: import("@/lib/motivation").DaySnapshot | null = today
    ? {
        deficitOrSurplus: today.deficitOrSurplus,
        diffFromGoal: today.diffFromGoal,
        proteinConsumed: today.proteinConsumed,
        proteinGoal: today.proteinGoal,
        waterConsumedMl: today.waterConsumedMl,
        waterGoalMl: today.waterGoalMl,
        hadWorkout: today.exerciseCalories > 0,
        loggingStreak,
      }
    : null;

  const yesterdayDay: import("@/lib/motivation").DaySnapshot | null = yesterday
    ? {
        deficitOrSurplus: yesterday.deficitOrSurplus,
        diffFromGoal: yesterday.diffFromGoal,
        proteinConsumed: yesterday.proteinConsumed,
        proteinGoal: yesterday.proteinGoal,
        waterConsumedMl: yesterday.waterConsumedMl,
        waterGoalMl: yesterday.waterGoalMl,
        hadWorkout: yesterday.exerciseCalories > 0,
        loggingStreak,
      }
    : null;

  const greeting = yesterdayGreeting(yesterdayDay, name);

  async function addWater(amount: number) {
    setWaterLoading(amount);
    const previousGoalMet = today ? waterMl >= today.waterGoalMl : false;
    const optimisticMl = waterMl + amount;
    setWaterMl(optimisticMl);
    try {
      const response = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl: amount }),
      });
      if (response.ok && today && !previousGoalMet && optimisticMl >= today.waterGoalMl) {
        celebrate();
      }
    } finally {
      setWaterLoading(null);
    }
  }

  const caloriePercent = today && today.caloriesGoal > 0 ? (today.caloriesConsumed / today.caloriesGoal) * 100 : 0;
  const proteinPercent = today && today.proteinGoal > 0 ? (today.proteinConsumed / today.proteinGoal) * 100 : 0;
  const waterPercent = today && today.waterGoalMl > 0 ? (waterMl / today.waterGoalMl) * 100 : 0;

  const groupedMeals = MEAL_ORDER.map((type) => ({
    type,
    label: MEAL_LABELS[type],
    entries: foodEntriesToday.filter((e) => e.mealType === type),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {showMorning && (
        <MorningModal greeting={greeting} onClose={() => setShowMorning(false)} />
      )}

      {/* Level progress */}
      <Card className="p-5 flex items-center gap-4 bg-[linear-gradient(135deg,var(--color-plum-soft),var(--color-surface))]">
        <div className="w-12 h-12 rounded-full bg-[var(--color-plum)] text-white flex items-center justify-center shrink-0">
          <Icon name="crown" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            Nivel {level.level} · {level.name}
          </p>
          {upcomingLevel && (
            <>
              <ProgressBar
                percent={((totalFitPoints - level.minPoints) / (upcomingLevel.minPoints - level.minPoints)) * 100}
                heightPx={6}
                className="mt-1.5"
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                {upcomingLevel.minPoints - totalFitPoints} Fit Points para &quot;{upcomingLevel.name}&quot;
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Main rings */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col items-center text-center gap-2">
          <ProgressRing percent={caloriePercent} color="var(--color-plum)">
            <div>
              <p className="text-xl font-display font-semibold">{today?.caloriesConsumed ?? 0}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">de {today?.caloriesGoal ?? 0} kcal</p>
            </div>
          </ProgressRing>
          <p className="text-xs text-[var(--color-text-secondary)]">Calorías</p>
        </Card>

        <Card className="p-5 flex flex-col items-center text-center gap-2">
          <ProgressRing percent={proteinPercent} color="var(--color-rose-strong)">
            <div>
              <p className="text-xl font-display font-semibold">{Math.round(today?.proteinConsumed ?? 0)}g</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">de {today?.proteinGoal ?? 0}g</p>
            </div>
          </ProgressRing>
          <p className="text-xs text-[var(--color-text-secondary)]">Proteína</p>
          {today && today.proteinCollagen > 0 && (
            <p className="text-[10px] text-[var(--color-text-muted)]">
              Incluye {Math.round(today.proteinCollagen)}g de colágeno
            </p>
          )}
        </Card>

        <Card className="p-5 flex flex-col items-center text-center gap-2">
          <ProgressRing percent={waterPercent} color="var(--color-lavender-strong)">
            <div>
              <p className="text-xl font-display font-semibold">{(waterMl / 1000).toFixed(1)}L</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">de {((today?.waterGoalMl ?? 0) / 1000).toFixed(1)}L</p>
            </div>
          </ProgressRing>
          <div className="flex gap-1.5">
            {WATER_QUICK_ADDS.map((amount) => (
              <button
                key={amount}
                onClick={() => addWater(amount)}
                disabled={waterLoading !== null}
                className="pressable text-[11px] px-2 py-1 rounded-full bg-[var(--color-bg-alt)] text-[var(--color-plum-strong)] font-medium disabled:opacity-50"
              >
                +{amount}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Balance + recommendation */}
      {day && (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <Icon name="balance" className="text-[var(--color-plum-strong)] mt-0.5" />
            <div>
              <p className="text-sm font-medium">{balanceMessage(day)}</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Gasto esperado hoy: {today?.expectedExpenditure} kcal (incluye {today?.exerciseCalories} kcal de
                ejercicio registrado)
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-4">
            {proteinMessage(day) && <Tip icon="protein" text={proteinMessage(day)!} />}
            {waterMessage(day) && <Tip icon="water" text={waterMessage(day)!} />}
            <Tip icon="strength" text={workoutMessage(day)} />
          </div>
        </Card>
      )}

      {/* Weekly summary */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Icon name="calendar" className="text-[var(--color-plum-strong)]" /> Resumen semanal
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Días en déficit" value={String(weekly.daysInDeficit)} />
          <MiniStat label="Cerca de mantenimiento" value={String(weekly.daysNearMaintenance)} />
          <MiniStat label="Días en superávit" value={String(weekly.daysInSurplus)} />
          <MiniStat label="Déficit diario promedio" value={`${weekly.avgDailyDeficit} kcal`} />
          <MiniStat label="Proteína promedio" value={`${weekly.avgProteinPercent}%`} />
          <MiniStat label="Agua promedio" value={`${weekly.avgWaterPercent}%`} />
          <MiniStat label="Racha de registro" value={`${loggingStreak} días`} />
          <MiniStat label="Racha de agua" value={`${waterStreak} días`} />
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-3">
          Tu constancia vale más que un día perfecto — priorizamos tu promedio semanal.
        </p>
      </Card>

      {/* Today's meals */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Icon name="nutrition" className="text-[var(--color-plum-strong)]" /> Comidas de hoy
          </p>
          <Link href="/food">
            <Button size="sm" variant="secondary" icon="add">
              Registrar
            </Button>
          </Link>
        </div>
        {groupedMeals.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
            Aún no registras comidas hoy. Cuando quieras, aquí está tu espacio.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groupedMeals.map((group) => (
              <div key={group.type}>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">{group.label}</p>
                <div className="flex flex-col gap-1">
                  {group.entries.map((entry) => (
                    <div key={entry.id} className="flex justify-between text-sm py-1.5 border-b border-[var(--color-border)] last:border-0">
                      <span className="truncate">{entry.foodItem?.name ?? entry.recipe?.name ?? entry.customName ?? "Alimento"}</span>
                      <span className="text-[var(--color-text-muted)] shrink-0 ml-2">{Math.round(entry.calories)} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Badges + challenges preview */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Icon name="achievements" className="text-[var(--color-plum-strong)]" /> Logros recientes
            </p>
            <Link href="/achievements" className="text-xs text-[var(--color-plum-strong)] hover:underline">
              Ver todos
            </Link>
          </div>
          {recentBadges.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Tu primera insignia está más cerca de lo que crees.</p>
          ) : (
            <div className="flex gap-3">
              {recentBadges.map((b) => (
                <div key={b.id} className="flex flex-col items-center gap-1 w-16 text-center">
                  <div className="w-11 h-11 rounded-full bg-[var(--color-plum-soft)] text-[var(--color-plum-strong)] flex items-center justify-center">
                    <Icon name={b.icon as IconName} />
                  </div>
                  <span className="text-[10px] leading-tight">{b.name}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Icon name="target" className="text-[var(--color-plum-strong)]" /> Retos activos
            </p>
            <Link href="/challenges" className="text-xs text-[var(--color-plum-strong)] hover:underline">
              Ver todos
            </Link>
          </div>
          {activeChallenges.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No tienes retos activos. Explora algunos suaves.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {activeChallenges.map((uc) => (
                <div key={uc.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{uc.challenge.title}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {uc.progress}/{uc.challenge.goalValue}
                    </span>
                  </div>
                  <ProgressBar percent={(uc.progress / uc.challenge.goalValue) * 100} heightPx={6} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Tip({ icon, text }: { icon: IconName; text: string }) {
  return (
    <div className="flex items-start gap-2 bg-[var(--color-bg-alt)] rounded-[var(--radius-md)] px-3 py-2.5">
      <Icon name={icon} className="text-[var(--color-plum-strong)] mt-0.5 text-xs" />
      <p className="text-xs text-[var(--color-text-secondary)]">{text}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-alt)] px-3 py-2.5">
      <p className="text-[10px] text-[var(--color-text-secondary)]">{label}</p>
      <p className="text-base font-semibold font-display">{value}</p>
    </div>
  );
}

function MorningModal({
  greeting,
  onClose,
}: {
  greeting: { headline: string; lines: string[] };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full sm:max-w-md bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-lg)]"
        style={{ animation: "slide-up 300ms var(--ease-drawer)" }}
      >
        <h2 className="font-display text-2xl mb-4">{greeting.headline}</h2>
        <div className="flex flex-col gap-2 mb-6">
          {greeting.lines.map((line, i) => (
            <p key={i} className="text-sm text-[var(--color-text-secondary)]">
              {line}
            </p>
          ))}
        </div>
        <Button onClick={onClose} className="w-full">
          Comenzar mi día
        </Button>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
