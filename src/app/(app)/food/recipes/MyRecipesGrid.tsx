"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";

export interface MyRecipe {
  id: string;
  name: string;
  servings: number;
  totalCalories: number;
  ingredientNames: string[];
}

export function MyRecipesGrid({ recipes: initialRecipes }: { recipes: MyRecipe[] }) {
  const router = useRouter();
  const [recipes, setRecipes] = useState(initialRecipes);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/food/recipes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    }
    setDeletingId(null);
  }

  if (recipes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Icon name="recipe" className="text-3xl text-[var(--color-text-muted)] mb-3" />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Crea tu primera receta combinando varios ingredientes — bowls, sopas, batidos, lo que prepares seguido, o
          guarda una de las recomendaciones de abajo.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {recipes.map((r) => (
        <Card key={r.id} className="p-5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold">{r.name}</p>
            <button
              onClick={() => handleDelete(r.id)}
              disabled={deletingId === r.id}
              className="pressable text-[var(--color-text-muted)] hover:text-[var(--color-error)] p-1 shrink-0"
              aria-label="Eliminar receta"
            >
              <Icon name="delete" />
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mb-2">
            {r.servings} porciones · {Math.round(r.totalCalories / r.servings)} kcal/porción
          </p>
          <ul className="text-xs text-[var(--color-text-secondary)] list-disc list-inside">
            {r.ingredientNames.slice(0, 3).map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
