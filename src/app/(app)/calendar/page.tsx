import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { startOfDay, dateKey } from "@/lib/date";
import { Card } from "@/components/ui/Card";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

interface GoalsCompleted {
  protein?: boolean;
  fat?: boolean;
  carbs?: boolean;
  deficit?: boolean;
  water?: boolean;
  workout?: boolean;
  logging?: boolean;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { session } = await requireOnboardedUser();
  const { month } = await searchParams;
  const base = month ? new Date(`${month}-01`) : new Date();
  const monthStart = startOfMonth(base);
  const monthEnd = endOfMonth(base);

  const summaries = await prisma.dailySummary.findMany({
    where: { userId: session.user.id, date: { gte: monthStart, lte: monthEnd } },
  });
  const byDate = new Map(summaries.map((s) => [startOfDay(s.date).toDateString(), s]));

  const firstWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells: (Date | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1))];

  const monthLabel = monthStart.toLocaleDateString("es", { month: "long", year: "numeric" });
  const prevMonth = dateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)).slice(0, 7);
  const nextMonth = dateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)).slice(0, 7);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link href={`/calendar?month=${prevMonth}`} className="pressable text-[var(--color-text-secondary)] px-2">
          ‹
        </Link>
        <h1 className="font-display text-2xl capitalize">{monthLabel}</h1>
        <Link href={`/calendar?month=${nextMonth}`} className="pressable text-[var(--color-text-secondary)] px-2">
          ›
        </Link>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-[var(--color-text-muted)] mb-2">
          {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const summary = byDate.get(date.toDateString());
            const isToday = date.toDateString() === new Date().toDateString();
            const isFuture = date.getTime() > Date.now();
            let bg = "var(--color-bg-alt)";
            if (summary) {
              if (summary.deficitOrSurplus < -50) bg = "var(--color-mint-soft)";
              else if (summary.deficitOrSurplus > 50) bg = "var(--color-coral-soft)";
              else bg = "var(--color-plum-soft)";
            }
            const goals: GoalsCompleted = summary ? JSON.parse(summary.goalsCompletedJson || "{}") : {};

            const cellContent = (
              <div
                className="aspect-square rounded-[var(--radius-sm)] flex flex-col items-center justify-center text-xs relative gap-1"
                style={{ background: bg, outline: isToday ? "2px solid var(--color-plum)" : undefined }}
              >
                {date.getDate()}
                {summary && (
                  <div className="flex gap-0.5">
                    <Dot ok={!!goals.deficit} />
                    <Dot ok={!!goals.protein} />
                    <Dot ok={!!goals.fat} />
                  </div>
                )}
              </div>
            );

            return (
              <div key={i}>
                {summary && !isFuture ? (
                  <Link href={`/history?date=${dateKey(date)}`}>{cellContent}</Link>
                ) : (
                  cellContent
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)]">
        <LegendDot color="var(--color-mint-soft)" label="Déficit" />
        <LegendDot color="var(--color-plum-soft)" label="Mantenimiento" />
        <LegendDot color="var(--color-coral-soft)" label="Superávit" />
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        Los puntos indican si cumpliste déficit, proteína y grasa ese día. Toca un día para ver su detalle.
      </p>
    </div>
  );
}

function Dot({ ok }: { ok: boolean }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full"
      style={{ background: ok ? "var(--color-mint)" : "var(--color-text-muted)", opacity: ok ? 1 : 0.35 }}
    />
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
