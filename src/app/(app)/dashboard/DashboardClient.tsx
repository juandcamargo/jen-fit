"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { celebrate } from "@/lib/celebrate";
import { balanceMessage, proteinMessage, waterMessage, workoutMessage, yesterdayGreeting } from "@/lib/motivation";
import { projectDailyBalance, suggestWaysToCloseGap } from "@/lib/recommendation";

interface SummaryLike {
  caloriesConsumed: number;
  caloriesGoal: number;
  targetDeficitKcal: number;
  proteinConsumed: number;
  proteinGoal: number;
  proteinCollagen: number;
  carbsConsumed: number;
  carbsGoal: number;
  fatConsumed: number;
  fatGoal: number;
  waterConsumedMl: number;
  waterGoalMl: number;
  baseExpenditure: number;
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
  weightKg,
  daysSinceMeasured,
  bodyFatPercent,
  targetBodyFatPercent,
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
  weightKg: number | null;
  daysSinceMeasured: number | null;
  bodyFatPercent: number | null;
  targetBodyFatPercent: number | null;
}) {
  const [showMorning, setShowMorning] = useState(false);
  const [waterMl, setWaterMl] = useState(today?.waterConsumedMl ?? 0);
  const [waterLoading, setWaterLoading] = useState<number | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
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

  // "Hasta el momento" — prorated by how much of the day has elapsed, so we
  // never compare a full day's expenditure against a half-finished day.
  const fractionOfDayElapsed = now ? (now.getHours() * 60 + now.getMinutes()) / 1440 : 1;
  const caloriesBurnedSoFar = today ? today.baseExpenditure * fractionOfDayElapsed + today.exerciseCalories : 0;
  const deficitSoFar = today ? today.caloriesConsumed - caloriesBurnedSoFar : 0;

  const projection = useMemo(() => {
    if (!today || !weightKg) return null;
    return projectDailyBalance({
      caloriesConsumedSoFar: today.caloriesConsumed,
      calorieGoal: today.caloriesGoal,
      baseExpenditure: today.baseExpenditure,
      exerciseCaloriesSoFar: today.exerciseCalories,
      targetDeficitKcal: today.targetDeficitKcal,
      weightKg,
    });
  }, [today, weightKg]);

  const suggestions = useMemo(() => {
    if (!projection || !weightKg) return [];
    return suggestWaysToCloseGap({ gapKcal: projection.gapToTargetKcal, weightKg });
  }, [projection, weightKg]);

  const projectedDeficit = projection ? projection.projectedBurn - projection.projectedIntake : 0;
  const targetDeficitKcal = today?.targetDeficitKcal ?? 0;

  const projectionChartData = projection
    ? [
        { name: "Consumo proyectado", value: projection.projectedIntake, color: "var(--color-coral)" },
        { name: "Gasto proyectado", value: projection.projectedBurn, color: "var(--color-mint)" },
      ]
    : [];
  const projectionMax = Math.max(1, ...projectionChartData.map((d) => d.value));
  // 10% headroom so the target marker never sits flush against the
  // overflow-hidden edge of the bar, where it would get clipped away.
  const deficitChartMax = Math.max(1, Math.abs(projectedDeficit), targetDeficitKcal) * 1.1;
  const targetMarkerPercent = Math.min(97, (targetDeficitKcal / deficitChartMax) * 100);

  const groupedMeals = MEAL_ORDER.map((type) => ({
    type,
    label: MEAL_LABELS[type],
    entries: foodEntriesToday.filter((e) => e.mealType === type),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {showMorning && <MorningModal greeting={greeting} onClose={() => setShowMorning(false)} />}

      {daysSinceMeasured != null && daysSinceMeasured >= 7 && (
        <Link href="/progress">
          <Card className="p-4 flex items-center gap-3 border-[var(--color-coral)] hoverable">
            <Icon name="ruler" className="text-[var(--color-coral)]" />
            <p className="text-sm text-[var(--color-text-secondary)] flex-1">
              Han pasado {daysSinceMeasured} días desde tu última medida — toca para registrar cintura, cadera,
              cuello y peso y ver tu avance real.
            </p>
            <Icon name="chevronRight" className="text-[var(--color-text-muted)]" />
          </Card>
        </Link>
      )}

      {/* ---------------- Métricas principales ---------------- */}
      <section>
        <SectionTitle icon="target" title="Tu día, ahora mismo" />

        <DeficitHeroCard
          deficitSoFar={deficitSoFar}
          targetDeficitKcal={targetDeficitKcal}
          fractionOfDayElapsed={fractionOfDayElapsed}
        />

        <div className="grid grid-cols-3 gap-3 mt-3">
          <MetricRingCard
            label="Consumidas hoy"
            value={Math.round(today?.caloriesConsumed ?? 0)}
            goal={Math.round(today?.caloriesGoal ?? 0)}
            unit="kcal"
            color="var(--color-plum)"
            size="sm"
          />
          <MetricRingCard
            label="Quemadas hasta ahora"
            value={Math.round(caloriesBurnedSoFar)}
            goal={Math.round(today?.expectedExpenditure ?? 0)}
            unit="kcal"
            color="var(--color-mint)"
            hint="Metabolismo + ejercicio"
            size="sm"
          />
          <MetricRingCard
            label="Proteína"
            value={Math.round(today?.proteinConsumed ?? 0)}
            goal={Math.round(today?.proteinGoal ?? 0)}
            unit="g"
            color="var(--color-rose-strong)"
            hint={today && today.proteinCollagen > 0 ? `Incl. ${Math.round(today.proteinCollagen)}g colágeno` : undefined}
            size="sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <MetricRingCard
            label="Grasa"
            value={Math.round(today?.fatConsumed ?? 0)}
            goal={Math.round(today?.fatGoal ?? 0)}
            unit="g"
            color="var(--color-coral)"
            size="sm"
          />
          <MetricRingCard
            label="Carbohidratos"
            value={Math.round(today?.carbsConsumed ?? 0)}
            goal={Math.round(today?.carbsGoal ?? 0)}
            unit="g"
            color="var(--color-lavender-strong)"
            size="sm"
          />
          <Card className="p-4 flex flex-col items-center text-center gap-2">
            <ProgressRing percent={today?.waterGoalMl ? (waterMl / today.waterGoalMl) * 100 : 0} size={78} strokeWidth={7} color="var(--color-lavender-strong)">
              <span className="text-sm font-display font-semibold">{(waterMl / 1000).toFixed(1)}L</span>
            </ProgressRing>
            <p className="text-[11px] text-[var(--color-text-secondary)]">Agua</p>
            <div className="flex flex-wrap justify-center gap-1 w-full">
              {WATER_QUICK_ADDS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => addWater(amount)}
                  disabled={waterLoading !== null}
                  className="pressable text-[9px] leading-none px-1.5 py-1 rounded-full bg-[var(--color-bg-alt)] text-[var(--color-plum-strong)] font-medium disabled:opacity-50"
                >
                  +{amount}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ---------------- Estimado del día ---------------- */}
      {projection && (
        <section>
          <SectionTitle icon="chartSimple" title="Estimado para hoy" />
          <Card className="p-5">
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              Si mantienes el ritmo de hoy: consumirías ~{projection.projectedIntake} kcal y quemarías ~
              {projection.projectedBurn} kcal (metabolismo + ejercicio).
            </p>

            <div className="flex flex-col gap-3">
              {projectionChartData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-text-secondary)] w-[110px] shrink-0">{entry.name}</span>
                  <div className="flex-1 h-6 rounded-full bg-[var(--color-bg-alt)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(entry.value / projectionMax) * 100}%`, background: entry.color }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-16 text-right shrink-0">{Math.round(entry.value)}</span>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-secondary)] w-[110px] shrink-0">Déficit proyectado</span>
                <div className="flex-1 h-6 rounded-full bg-[var(--color-bg-alt)] overflow-hidden relative">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (Math.abs(projectedDeficit) / deficitChartMax) * 100)}%`,
                      background: projection.onTrack ? "var(--color-mint)" : "var(--color-coral)",
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-text-primary)]"
                    style={{ left: `${targetMarkerPercent}%` }}
                    title="Meta de hoy"
                  />
                </div>
                <span className="text-sm font-semibold w-16 text-right shrink-0">
                  {projectedDeficit >= 0 ? "-" : "+"}
                  {Math.round(Math.abs(projectedDeficit))}
                </span>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] -mt-1">
                La línea marca tu meta de hoy: -{Math.round(targetDeficitKcal)} kcal
              </p>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
              <Icon
                name={projection.onTrack ? "circleCheck" : "info"}
                className={projection.onTrack ? "text-[var(--color-mint)]" : "text-[var(--color-coral)]"}
              />
              <p className="text-sm">
                {projection.onTrack
                  ? "Vas en camino a tu déficit objetivo de hoy."
                  : `Te faltan ~${projection.gapToTargetKcal} kcal para llegar a tu déficit objetivo de hoy.`}
              </p>
            </div>

            {suggestions.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-2 mt-3">
                {suggestions.map((s) => (
                  <div key={s.type} className="bg-[var(--color-bg-alt)] rounded-[var(--radius-md)] p-3">
                    <p className="text-xs font-medium">{s.label}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{s.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      )}

      {/* ---------------- Comidas de hoy ---------------- */}
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

      {/* ---------------- Logro del día ---------------- */}
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

      {/* ---------------- Resumen semanal ---------------- */}
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
        {bodyFatPercent != null && targetBodyFatPercent != null && (
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            % de grasa actual: {bodyFatPercent}% · meta: {targetBodyFatPercent}%
          </p>
        )}
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Tu constancia vale más que un día perfecto — priorizamos tu promedio semanal.
        </p>
      </Card>

      {/* ---------------- Logros recientes ---------------- */}
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
                  <div className="h-1.5 rounded-full bg-[var(--color-plum-soft)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-plum)]"
                      style={{ width: `${Math.min(100, (uc.progress / uc.challenge.goalValue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <p className="text-sm font-semibold flex items-center gap-2 mb-3 text-[var(--color-text-secondary)]">
      <Icon name={icon} className="text-[var(--color-plum-strong)]" /> {title}
    </p>
  );
}

function MetricRingCard({
  label,
  value,
  goal,
  unit,
  color,
  hint,
  size = "md",
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  hint?: string;
  size?: "md" | "sm";
}) {
  const percent = goal > 0 ? (value / goal) * 100 : 0;
  const ringSize = size === "md" ? 96 : 78;
  return (
    <Card className="p-4 flex flex-col items-center text-center gap-2">
      <ProgressRing percent={percent} size={ringSize} strokeWidth={size === "md" ? 9 : 7} color={color}>
        <div>
          <p className={size === "md" ? "text-lg font-display font-semibold" : "text-sm font-display font-semibold"}>
            {value}
            <span className="text-[10px] font-sans text-[var(--color-text-muted)]">{unit}</span>
          </p>
          <p className="text-[9px] text-[var(--color-text-muted)]">de {goal}{unit}</p>
        </div>
      </ProgressRing>
      <p className="text-[11px] text-[var(--color-text-secondary)]">{label}</p>
      {hint && <p className="text-[9px] text-[var(--color-text-muted)]">{hint}</p>}
    </Card>
  );
}

// The headline metric: today's calorie deficit, shown against the pace
// needed at this hour to hit the day's target (targetDeficitKcal is a
// full-day goal, so we prorate it by how much of the day has elapsed).
function DeficitHeroCard({
  deficitSoFar,
  targetDeficitKcal,
  fractionOfDayElapsed,
}: {
  deficitSoFar: number;
  targetDeficitKcal: number;
  fractionOfDayElapsed: number;
}) {
  const isDeficit = deficitSoFar < 0;
  const currentMagnitude = Math.abs(deficitSoFar);
  const tooEarly = fractionOfDayElapsed < 0.15;
  const proratedTarget = Math.max(targetDeficitKcal * fractionOfDayElapsed, 40);
  const percent = isDeficit ? Math.min(100, (currentMagnitude / proratedTarget) * 100) : 0;
  const onPace = isDeficit && currentMagnitude >= proratedTarget * 0.9;
  const color = !isDeficit ? "var(--color-coral)" : onPace ? "var(--color-mint)" : "var(--color-plum)";

  let statusText: string;
  if (tooEarly) {
    statusText = "El día recién empieza — sigue registrando tus comidas y actividad.";
  } else if (!isDeficit) {
    statusText = `Vas ${Math.round(currentMagnitude)} kcal en superávit por ahora. Aún puedes ajustar el resto del día.`;
  } else if (onPace) {
    statusText = "Vas al ritmo correcto para cumplir tu meta de hoy.";
  } else {
    statusText = `Vas ${Math.round(proratedTarget - currentMagnitude)} kcal por debajo del ritmo esperado a esta hora.`;
  }

  return (
    <Card className="p-6 flex flex-col sm:flex-row items-center gap-6" style={{ borderColor: color }}>
      <ProgressRing percent={percent} size={128} strokeWidth={11} color={color}>
        <div className="text-center">
          <p className="text-2xl font-display font-semibold" style={{ color }}>
            {isDeficit ? "-" : "+"}
            {Math.round(currentMagnitude)}
          </p>
          <p className="text-[10px] text-[var(--color-text-muted)]">kcal hasta ahora</p>
        </div>
      </ProgressRing>
      <div className="flex-1 text-center sm:text-left">
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
          Déficit calórico de hoy
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Meta de hoy: <span className="font-semibold text-[var(--color-text-primary)]">-{Math.round(targetDeficitKcal)} kcal</span>
        </p>
        <p className="text-sm mt-2">{statusText}</p>
      </div>
    </Card>
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
