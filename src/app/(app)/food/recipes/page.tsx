import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { RecipeIdeasSection } from "./RecipeIdeasSection";

export default async function RecipesPage() {
  const { session } = await requireOnboardedUser();
  const recipes = await prisma.recipe.findMany({
    where: { userId: session.user.id },
    include: { ingredients: { include: { foodItem: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href="/food" className="pressable text-[var(--color-text-secondary)]">
          <Icon name="back" />
        </Link>
        <h1 className="font-display text-2xl flex-1">Tus recetas</h1>
        <Link href="/food/recipes/new">
          <Button size="sm" icon="add">
            Nueva receta
          </Button>
        </Link>
      </div>

      {recipes.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon name="recipe" className="text-3xl text-[var(--color-text-muted)] mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Crea tu primera receta combinando varios ingredientes — bowls, sopas, batidos, lo que prepares seguido.
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {recipes.map((r) => {
            const totalCalories = r.ingredients.reduce(
              (s, i) => s + (i.foodItem.caloriesPer100g * i.quantityG) / 100,
              0
            );
            return (
              <Card key={r.id} className="p-5">
                <p className="text-sm font-semibold mb-1">{r.name}</p>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">
                  {r.servings} porciones · {Math.round(totalCalories / r.servings)} kcal/porción
                </p>
                <ul className="text-xs text-[var(--color-text-secondary)] list-disc list-inside">
                  {r.ingredients.slice(0, 3).map((i) => (
                    <li key={i.id}>{i.foodItem.name}</li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <div className="border-t border-[var(--color-border)] pt-5">
        <RecipeIdeasSection />
      </div>
    </div>
  );
}
