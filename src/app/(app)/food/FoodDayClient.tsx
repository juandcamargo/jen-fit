"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { celebrate } from "@/lib/celebrate";
import type { DeficitCalendarMonth } from "@/lib/deficitCalendar";

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

const MEAL_ORDER = Object.keys(MEAL_LABELS);

interface Entry {
  id: string;
  mealType: string;
  customName: string | null;
  calories: number;
  protein: number;
  proteinCollagen: number;
  carbs: number;
  fat: number;
  quantityG: number;
  foodItem: { name: string; brand: string | null } | null;
  recipe: { name: string } | null;
}

interface SummaryLike {
  caloriesConsumed: number;
  caloriesGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  carbsConsumed: number;
  carbsGoal: number;
  fatConsumed: number;
  fatGoal: number;
}

interface KeySupplement {
  id: string;
  name: string;
  dose: number;
  unit: string;
  isCreatine: boolean;
  proteinType: string;
  takenToday: boolean;
}

function addDaysToKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FoodDayClient({
  entries: initialEntries,
  summary,
  keySupplements: initialKeySupplements,
  dateKey,
  isToday,
  calendar,
}: {
  entries: Entry[];
  summary: SummaryLike | null;
  keySupplements: KeySupplement[];
  dateKey: string;
  isToday: boolean;
  calendar: DeficitCalendarMonth;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [keySupplements, setKeySupplements] = useState(initialKeySupplements);
  const [showCalendar, setShowCalendar] = useState(false);

  async function toggleSupplement(s: KeySupplement) {
    const nextTaken = !s.takenToday;
    setKeySupplements((prev) => prev.map((x) => (x.id === s.id ? { ...x, takenToday: nextTaken } : x)));
    const res = await fetch("/api/supplements/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplementId: s.id, taken: nextTaken, date: dateKey }),
    });
    if (res.ok && nextTaken) celebrate();
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const response = await fetch(`/api/food/entries/${id}`, { method: "DELETE" });
    if (response.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      router.refresh();
    }
    setDeletingId(null);
  }

  const groups = MEAL_ORDER.map((type) => ({
    type,
    label: MEAL_LABELS[type],
    entries: entries.filter((e) => e.mealType === type),
  })).filter((g) => g.entries.length > 0);

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
  const totalProtein = entries.reduce((s, e) => s + e.protein, 0);
  const totalCarbs = entries.reduce((s, e) => s + e.carbs, 0);
  const totalFat = entries.reduce((s, e) => s + e.fat, 0);

  const addHref = (meal?: string) => `/food/add?date=${dateKey}${meal ? `&meal=${meal}` : ""}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/food?date=${addDaysToKey(dateKey, -1)}`)} className="pressable text-[var(--color-text-secondary)] p-1.5">
            <Icon name="chevronLeft" />
          </button>
          <div>
            <h1 className="font-display text-xl">{isToday ? "Nutrición de hoy" : "Nutrición"}</h1>
            {!isToday && (
              <p className="text-xs text-[var(--color-text-muted)] capitalize">
                {new Date(`${dateKey}T00:00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            )}
          </div>
          <button
            onClick={() => router.push(`/food?date=${addDaysToKey(dateKey, 1)}`)}
            disabled={addDaysToKey(dateKey, 1) > new Date().toISOString().slice(0, 10)}
            className="pressable text-[var(--color-text-secondary)] p-1.5 disabled:opacity-30"
          >
            <Icon name="chevronRight" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCalendar(true)}
            className="pressable w-9 h-9 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-center justify-center"
            aria-label="Ver calendario de déficit"
          >
            <Icon name="calendar" />
          </button>
          <Link href="/food/recipes">
            <Button variant="secondary" size="sm" icon="recipe">
              Recetas
            </Button>
          </Link>
        </div>
      </div>

      {!isToday && (
        <Link href={`/food?date=${new Date().toISOString().slice(0, 10)}`} className="text-xs text-[var(--color-plum-strong)] hover:underline -mt-3">
          Volver a hoy
        </Link>
      )}

      {showCalendar && (
        <CalendarModal calendar={calendar} selectedDateKey={dateKey} onClose={() => setShowCalendar(false)} />
      )}

      <Card className="p-5">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-medium">Calorías</span>
          <span className="text-[var(--color-text-secondary)]">
            {Math.round(totalCalories)} / {summary?.caloriesGoal ?? 0} kcal
          </span>
        </div>
        <ProgressBar percent={summary?.caloriesGoal ? (totalCalories / summary.caloriesGoal) * 100 : 0} />

        <div className="grid grid-cols-3 gap-3 mt-4">
          <MacroStat label="Proteína" value={totalProtein} goal={summary?.proteinGoal} unit="g" color="var(--color-rose-strong)" />
          <MacroStat label="Carbohidratos" value={totalCarbs} goal={summary?.carbsGoal} unit="g" color="var(--color-lavender-strong)" />
          <MacroStat label="Grasas" value={totalFat} goal={summary?.fatGoal} unit="g" color="var(--color-coral)" />
        </div>
      </Card>

      {keySupplements.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Icon name="supplements" className="text-[var(--color-plum-strong)]" /> Suplementos
            </p>
            <Link href="/supplements" className="text-xs text-[var(--color-plum-strong)] hover:underline">
              Gestionar
            </Link>
          </div>
          <div className="flex gap-3">
            {keySupplements.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSupplement(s)}
                className={`pressable flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[var(--radius-md)] border transition-colors duration-150 ${
                  s.takenToday
                    ? "border-[var(--color-mint)] bg-[var(--color-mint-soft)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                <Icon name={s.isCreatine ? "creatine" : "collagen"} className={s.takenToday ? "text-[var(--color-mint)]" : "text-[var(--color-text-muted)]"} />
                <span className="text-xs font-medium">{s.name}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {s.dose} {s.unit}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {groups.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon name="nutrition" className="text-3xl text-[var(--color-text-muted)] mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            {isToday ? "Aún no registras comidas hoy." : "No hay comidas registradas este día."} Cuando quieras, aquí
            está tu espacio.
          </p>
          <Link href={addHref()}>
            <Button icon="add">Registrar comida</Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <Card key={group.type} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{group.label}</p>
                <Link href={addHref(group.type)} className="text-xs text-[var(--color-plum-strong)] hover:underline">
                  + Añadir
                </Link>
              </div>
              <div className="flex flex-col">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        {entry.foodItem?.name ?? entry.recipe?.name ?? entry.customName ?? "Alimento"}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {Math.round(entry.quantityG)} g · {Math.round(entry.calories)} kcal · {Math.round(entry.protein)}g prot
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                      className="pressable text-[var(--color-text-muted)] hover:text-[var(--color-error)] p-2"
                      aria-label="Eliminar"
                    >
                      <Icon name="delete" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          <Link href={addHref()}>
            <Button icon="add" className="w-full">
              Registrar otra comida
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

function MacroStat({
  label,
  value,
  goal,
  unit,
  color,
}: {
  label: string;
  value: number;
  goal?: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="text-lg font-display font-semibold" style={{ color }}>
        {Math.round(value)}
        {unit}
      </p>
      {goal != null && <p className="text-[10px] text-[var(--color-text-muted)]">de {goal}{unit}</p>}
    </div>
  );
}

function CalendarModal({
  calendar,
  selectedDateKey,
  onClose,
}: {
  calendar: DeficitCalendarMonth;
  selectedDateKey: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-lg)]"
        style={{ animation: "slide-up 250ms var(--ease-drawer, ease-out)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Icon name="calendar" className="text-[var(--color-plum-strong)]" /> Déficit este mes
          </p>
          <button onClick={onClose} className="pressable text-[var(--color-text-secondary)] p-1.5" aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1 mb-3">
          <Link
            href={`/food?date=${selectedDateKey}&calMonth=${calendar.prevMonth}`}
            className="pressable text-[var(--color-text-secondary)] p-1.5"
            aria-label="Mes anterior"
          >
            <Icon name="chevronLeft" />
          </Link>
          <span className="text-xs text-[var(--color-text-secondary)] capitalize w-28 text-center">
            {calendar.monthLabel}
          </span>
          <Link
            href={`/food?date=${selectedDateKey}&calMonth=${calendar.nextMonth}`}
            className="pressable text-[var(--color-text-secondary)] p-1.5"
            aria-label="Mes siguiente"
          >
            <Icon name="chevronRight" />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-[var(--color-text-muted)] mb-1.5">
          {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {calendar.cells.map((cell, i) => {
            if (!cell) return <div key={i} />;
            let bg = "var(--color-bg-alt)";
            let textColor = "var(--color-text-muted)";
            if (cell.hasData) {
              bg = cell.met ? "var(--color-mint)" : "var(--color-coral)";
              textColor = "white";
            }
            const dayCell = (
              <div
                className="aspect-square rounded-[var(--radius-sm)] flex items-center justify-center text-[11px] font-medium"
                style={{
                  background: bg,
                  color: cell.hasData ? textColor : "var(--color-text-muted)",
                  opacity: cell.isFuture ? 0.4 : 1,
                  outline: cell.isToday ? "2px solid var(--color-plum)" : undefined,
                }}
              >
                {cell.day}
              </div>
            );
            return (
              <div key={i}>
                {cell.hasData ? (
                  <Link href={`/food?date=${cell.dateKey}&calMonth=${cell.dateKey.slice(0, 7)}`}>{dayCell}</Link>
                ) : (
                  dayCell
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 text-[11px] text-[var(--color-text-secondary)] mt-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-mint)" }} /> Déficit logrado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-coral)" }} /> No logrado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-bg-alt)" }} /> Sin datos
          </span>
        </div>
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
