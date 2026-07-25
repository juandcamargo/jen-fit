"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

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
  fatConsumed: number;
}

export function FoodDayClient({ entries: initialEntries, summary }: { entries: Entry[]; summary: SummaryLike | null }) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Nutrición de hoy</h1>
        <Link href="/food/recipes">
          <Button variant="secondary" size="sm" icon="recipe">
            Recetas
          </Button>
        </Link>
      </div>

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
          <MacroStat label="Carbohidratos" value={totalCarbs} unit="g" color="var(--color-lavender-strong)" />
          <MacroStat label="Grasas" value={totalFat} unit="g" color="var(--color-coral)" />
        </div>
      </Card>

      {groups.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon name="nutrition" className="text-3xl text-[var(--color-text-muted)] mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Aún no registras comidas hoy. Cuando quieras, aquí está tu espacio.
          </p>
          <Link href="/food/add">
            <Button icon="add">Registrar comida</Button>
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <Card key={group.type} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{group.label}</p>
                <Link href={`/food/add?meal=${group.type}`} className="text-xs text-[var(--color-plum-strong)] hover:underline">
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
          <Link href="/food/add">
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
