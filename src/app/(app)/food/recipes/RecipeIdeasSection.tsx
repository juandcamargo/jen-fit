"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { celebrate } from "@/lib/celebrate";
import { IDEA_MEAL_LABELS, RECIPE_IDEAS, type IdeaMealType, type RecipeIdea } from "@/lib/recipeIdeas";

const MEAL_ORDER: IdeaMealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function RecipeIdeasSection() {
  const router = useRouter();
  const [activeMeal, setActiveMeal] = useState<IdeaMealType>("breakfast");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  async function addToDiet(idea: RecipeIdea) {
    setAddingId(idea.id);
    const res = await fetch("/api/food/recipe-ideas/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId: idea.id, mealType: idea.mealType }),
    });
    setAddingId(null);
    if (res.ok) {
      setAddedId(idea.id);
      celebrate();
      router.refresh();
      setTimeout(() => setAddedId((current) => (current === idea.id ? null : current)), 2500);
    }
  }

  const ideas = RECIPE_IDEAS.filter((i) => i.mealType === activeMeal);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold flex items-center gap-2 mb-1">
          <Icon name="star" className="text-[var(--color-plum-strong)]" /> Ideas de recetas
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Opciones balanceadas listas para añadir a tu día — toca una para registrarla directamente.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {MEAL_ORDER.map((meal) => (
          <button
            key={meal}
            onClick={() => setActiveMeal(meal)}
            className={`pressable shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${
              activeMeal === meal
                ? "bg-[var(--color-plum)] text-white border-[var(--color-plum)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
            }`}
          >
            {IDEA_MEAL_LABELS[meal]}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {ideas.map((idea) => {
          const isAdding = addingId === idea.id;
          const isAdded = addedId === idea.id;
          return (
            <Card key={idea.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 shrink-0 rounded-full bg-[var(--color-plum-soft)] text-[var(--color-plum-strong)] flex items-center justify-center">
                  <Icon name={idea.icon} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{idea.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {idea.calories} kcal · {idea.protein}g prot · {idea.carbs}g carb · {idea.fat}g grasa
                  </p>
                </div>
              </div>

              <ul className="text-xs text-[var(--color-text-secondary)] list-disc list-inside">
                {idea.ingredients.map((ing, i) => (
                  <li key={i}>{ing}</li>
                ))}
              </ul>

              <Button
                size="sm"
                variant={isAdded ? "secondary" : "primary"}
                icon={isAdded ? "circleCheck" : "add"}
                loading={isAdding}
                disabled={isAdding}
                onClick={() => addToDiet(idea)}
              >
                {isAdded ? "Añadida a hoy" : "Añadir a mi dieta"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
