"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  caloriesPer100g: number;
}

interface IngredientRow {
  foodItem: FoodItem;
  quantityG: number;
}

export default function NewRecipePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  function addIngredient(food: FoodItem) {
    setIngredients((prev) => [...prev, { foodItem: food, quantityG: 100 }]);
    setQuery("");
    setResults([]);
  }

  function updateQuantity(index: number, quantityG: number) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, quantityG } : ing)));
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  const totalCalories = ingredients.reduce((s, i) => s + (i.foodItem.caloriesPer100g * i.quantityG) / 100, 0);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/food/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        servings,
        ingredients: ingredients.map((i) => ({ foodItemId: i.foodItem.id, quantityG: i.quantityG })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No pudimos guardar la receta.");
      return;
    }
    router.push("/food/recipes");
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="pressable text-[var(--color-text-secondary)]">
          <Icon name="back" />
        </button>
        <h1 className="font-display text-2xl">Nueva receta</h1>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <Input label="Nombre de la receta" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Número de porciones"
          type="number"
          value={servings}
          onChange={(e) => setServings(Number(e.target.value))}
        />
      </Card>

      <Card className="p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold">Ingredientes</p>
        <Input
          icon="search"
          placeholder="Buscar ingrediente..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <div className="flex flex-col gap-1 border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
            {results.map((f) => (
              <button
                key={f.id}
                onClick={() => addIngredient(f)}
                className="pressable flex justify-between px-3 py-2 text-sm hover:bg-[var(--color-bg-alt)] text-left"
              >
                <span>{f.name}</span>
                <Icon name="add" className="text-[var(--color-plum-strong)]" />
              </button>
            ))}
          </div>
        )}

        {ingredients.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-2">Aún no agregas ingredientes.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm flex-1 truncate">{ing.foodItem.name}</span>
                <input
                  type="number"
                  value={ing.quantityG}
                  onChange={(e) => updateQuantity(i, Number(e.target.value))}
                  className="w-20 h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-base bg-[var(--color-surface)]"
                />
                <span className="text-xs text-[var(--color-text-muted)]">g</span>
                <button onClick={() => removeIngredient(i)} className="pressable text-[var(--color-text-muted)] hover:text-[var(--color-error)] p-1.5">
                  <Icon name="delete" />
                </button>
              </div>
            ))}
          </div>
        )}

        {ingredients.length > 0 && (
          <p className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-alt)] rounded-[var(--radius-md)] p-3">
            Total: {Math.round(totalCalories)} kcal · {Math.round(totalCalories / Math.max(servings, 1))} kcal por porción
          </p>
        )}
      </Card>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      <Button onClick={handleSave} loading={saving} disabled={!name || ingredients.length === 0} icon="confirm">
        Guardar receta
      </Button>
    </div>
  );
}
