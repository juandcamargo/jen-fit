import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { addDays, startOfDay } from "@/lib/date";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";

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

export default async function ExercisePage() {
  const { session } = await requireOnboardedUser();
  const weekAgo = addDays(startOfDay(new Date()), -6);

  const [strengthWorkouts, cardioSessions] = await Promise.all([
    prisma.strengthWorkout.findMany({
      where: { userId: session.user.id, date: { gte: weekAgo } },
      orderBy: { date: "desc" },
      include: { sets: true },
    }),
    prisma.cardioSession.findMany({
      where: { userId: session.user.id, date: { gte: weekAgo } },
      orderBy: { date: "desc" },
    }),
  ]);

  const combined = [
    ...strengthWorkouts.map((w) => ({
      id: w.id,
      date: w.date,
      title: w.name || "Fuerza",
      subtitle: `${w.sets.length} series · ${w.durationMin} min`,
      calories: w.caloriesEstimate,
      icon: "strength" as const,
    })),
    ...cardioSessions.map((c) => ({
      id: c.id,
      date: c.date,
      title: CARDIO_LABELS[c.type] ?? c.type,
      subtitle: `${c.minutes} min`,
      calories: c.caloriesEstimate,
      icon: "cardio" as const,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const weekCalories = combined.reduce((s, w) => s + (w.calories ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <h1 className="font-display text-2xl">Ejercicio</h1>

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

      <div className="flex flex-col gap-2">
        {combined.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Aún no registras entrenamientos esta semana. Un día de descanso también puede ser parte del progreso.
            </p>
          </Card>
        ) : (
          combined.map((w) => (
            <Card key={w.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center text-[var(--color-plum-strong)]">
                  <Icon name={w.icon} />
                </div>
                <div>
                  <p className="text-sm font-medium">{w.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{w.subtitle}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    {w.date.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                    {w.date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {w.calories != null ? `${Math.round(w.calories)} kcal` : ""}
              </span>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
