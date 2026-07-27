import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { addDays, startOfDay, startOfMonth, endOfMonth } from "@/lib/date";
import { buildTrainingCalendarMonth } from "@/lib/trainingCalendar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/icons/Icon";
import { ExerciseList, type ExerciseListItem } from "./ExerciseList";
import { TrainingCalendarButton } from "./TrainingCalendarButton";

const CARDIO_LABELS: Record<string, string> = {
  walk: "Caminata",
  incline_walk: "Caminata inclinada",
  run: "Correr",
  bike: "Bicicleta",
  elliptical: "Elíptica",
  stairmaster: "Escaladora",
  row: "Remo",
  swim: "Natación",
  dance: "Baile",
  class: "Clase grupal",
  hiit: "HIIT",
  other: "Otro",
};

export default async function ExercisePage({
  searchParams,
}: {
  searchParams: Promise<{ calMonth?: string }>;
}) {
  const { session } = await requireOnboardedUser();
  const { calMonth } = await searchParams;
  const weekAgo = addDays(startOfDay(new Date()), -6);
  const monthAnchor = calMonth ? new Date(`${calMonth}-01T00:00:00`) : new Date();

  const [strengthWorkouts, cardioSessions, monthStrengthDates, monthCardioDates] = await Promise.all([
    prisma.strengthWorkout.findMany({
      where: { userId: session.user.id, date: { gte: weekAgo } },
      orderBy: { date: "desc" },
      include: { sets: true },
    }),
    prisma.cardioSession.findMany({
      where: { userId: session.user.id, date: { gte: weekAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.strengthWorkout.findMany({
      where: { userId: session.user.id, date: { gte: startOfMonth(monthAnchor), lte: endOfMonth(monthAnchor) } },
      select: { date: true },
    }),
    prisma.cardioSession.findMany({
      where: { userId: session.user.id, date: { gte: startOfMonth(monthAnchor), lte: endOfMonth(monthAnchor) } },
      select: { date: true },
    }),
  ]);

  const combined: ExerciseListItem[] = [
    ...strengthWorkouts.map((w) => ({
      id: w.id,
      kind: "strength" as const,
      date: w.date.toISOString(),
      title: w.name || "Fuerza",
      subtitle: `${w.sets.length} series · ${w.durationMin} min`,
      calories: w.caloriesEstimate,
      icon: "strength" as const,
    })),
    ...cardioSessions.map((c) => ({
      id: c.id,
      kind: "cardio" as const,
      date: c.date.toISOString(),
      title: CARDIO_LABELS[c.type] ?? c.type,
      subtitle: `${c.minutes} min`,
      calories: c.caloriesEstimate,
      icon: "cardio" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const weekCalories = combined.reduce((s, w) => s + (w.calories ?? 0), 0);
  const trainingCalendar = buildTrainingCalendarMonth(monthAnchor, [
    ...monthStrengthDates.map((w) => w.date),
    ...monthCardioDates.map((c) => c.date),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Ejercicio</h1>
        <TrainingCalendarButton calendar={trainingCalendar} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/exercise/strength/new">
          <Card className="p-5 flex flex-col items-center gap-2 pressable hoverable">
            <div className="w-12 h-12 rounded-full bg-[var(--color-plum-soft)] text-[var(--color-plum-strong)] flex items-center justify-center">
              <Icon name="strength" className="text-lg" />
            </div>
            <p className="text-sm font-medium">Registrar fuerza</p>
          </Card>
        </Link>
        <Link href="/exercise/cardio/new">
          <Card className="p-5 flex flex-col items-center gap-2 pressable hoverable">
            <div className="w-12 h-12 rounded-full bg-[var(--color-mint-soft)] text-[var(--color-mint)] flex items-center justify-center">
              <Icon name="cardio" className="text-lg" />
            </div>
            <p className="text-sm font-medium">Registrar cardio</p>
          </Card>
        </Link>
      </div>

      <Card className="p-5">
        <p className="text-sm font-semibold mb-1">Esta semana</p>
        <p className="text-2xl font-display font-semibold">{Math.round(weekCalories)} kcal activas</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">{combined.length} sesiones registradas</p>
      </Card>

      <ExerciseList items={combined} />
    </div>
  );
}
