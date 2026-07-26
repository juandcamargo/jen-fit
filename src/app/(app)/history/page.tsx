import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { addDays, startOfDay, dateKey } from "@/lib/date";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/icons/Icon";

const RANGE_DAYS = 30;

export default async function HistoryPage() {
  const { session } = await requireOnboardedUser();
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -RANGE_DAYS + 1);

  const summaries = await prisma.dailySummary.findMany({
    where: { userId: session.user.id, date: { gte: rangeStart, lte: today } },
    orderBy: { date: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Historial</h1>
        <Link href="/calendar" className="text-xs text-[var(--color-plum-strong)] hover:underline">
          Ver calendario
        </Link>
      </div>

      {summaries.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Aún no hay días registrados. Empieza a registrar comidas para ver tu historial aquí.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {summaries.map((s) => {
            const goals = JSON.parse(s.goalsCompletedJson || "{}") as Record<string, boolean>;
            const isDeficit = s.deficitOrSurplus < -50;
            const isSurplus = s.deficitOrSurplus > 50;
            const statusColor = isDeficit ? "var(--color-mint)" : isSurplus ? "var(--color-coral)" : "var(--color-plum)";
            const statusLabel = isDeficit ? "Déficit" : isSurplus ? "Superávit" : "Mantenimiento";

            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold capitalize">
                      {s.date.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <span className="text-[10px] font-medium" style={{ color: statusColor }}>
                      {statusLabel} · {Math.abs(Math.round(s.deficitOrSurplus))} kcal
                    </span>
                  </div>
                  <Link
                    href={`/food?date=${dateKey(s.date)}`}
                    className="pressable text-xs text-[var(--color-plum-strong)] flex items-center gap-1 hover:underline"
                  >
                    <Icon name="edit" /> Editar
                  </Link>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  <HistoryStat icon="nutrition" value={`${Math.round(s.caloriesConsumed)}`} label="kcal" ok={Math.round(s.caloriesConsumed) <= s.caloriesGoal * 1.1} />
                  <HistoryStat icon="protein" value={`${Math.round(s.proteinConsumed)}g`} label="proteína" ok={!!goals.protein} />
                  <HistoryStat icon="carbs" value={`${Math.round(s.carbsConsumed)}g`} label="carbs" ok={!!goals.carbs} />
                  <HistoryStat icon="apple" value={`${Math.round(s.fatConsumed)}g`} label="grasa" ok={!!goals.fat} />
                  <HistoryStat icon="water" value={`${Math.round(s.waterConsumedMl / 250)}`} label="vasos" ok={!!goals.water} />
                  <HistoryStat icon="strength" value={`${Math.round(s.exerciseCalories)}`} label="kcal act." ok={!!goals.workout} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryStat({ icon, value, label, ok }: { icon: import("@/components/icons/Icon").IconName; value: string; label: string; ok: boolean }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-alt)] py-2 px-1">
      <Icon name={icon} className={`text-xs mb-1 ${ok ? "text-[var(--color-mint)]" : "text-[var(--color-text-muted)]"}`} />
      <p className="text-xs font-semibold">{value}</p>
      <p className="text-[9px] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
