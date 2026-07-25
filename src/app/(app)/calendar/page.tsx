import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { startOfDay } from "@/lib/date";
import { Card } from "@/components/ui/Card";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <h1 className="font-display text-2xl capitalize">{monthLabel}</h1>

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
            let bg = "var(--color-bg-alt)";
            if (summary) {
              if (summary.deficitOrSurplus < -50) bg = "var(--color-mint-soft)";
              else if (summary.deficitOrSurplus > 50) bg = "var(--color-coral-soft)";
              else bg = "var(--color-plum-soft)";
            }
            return (
              <div
                key={i}
                className="aspect-square rounded-[var(--radius-sm)] flex items-center justify-center text-xs relative"
                style={{ background: bg, outline: isToday ? "2px solid var(--color-plum)" : undefined }}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
        <LegendDot color="var(--color-mint-soft)" label="Déficit" />
        <LegendDot color="var(--color-plum-soft)" label="Mantenimiento" />
        <LegendDot color="var(--color-coral-soft)" label="Superávit" />
      </div>
    </div>
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
