import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { RecipeIdeasSection } from "./RecipeIdeasSection";

function RecipeGrid({ recipes }: { recipes: Awaited<ReturnType<typeof getRecipes>> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {recipes.map((r) => {
        const totalCalories = r.ingredients.reduce(
          (s, i) => s + (i.foodItem.caloriesPer100g * i.quantityG) / 100,
          0
        );
        return (
          <Card key={r.id} className="p-5">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-semibold">{r.name}</p>
              {r.isGlobal && (
                <span className="text-[9px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--color-mint-soft)] text-[var(--color-mint)] shrink-0">
                  Precargada
                </span>
              )}
            </div>
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
  );
}

async function getRecipes(userId: string, isGlobal: boolean) {
  return prisma.recipe.findMany({
    where: isGlobal ? { isGlobal: true } : { userId },
    include: { ingredients: { include: { foodItem: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export default async function RecipesPage() {
  const { session } = await requireOnboardedUser();
  const [myRecipes, globalRecipes] = await Promise.all([
    getRecipes(session.user.id, false),
    getRecipes(session.user.id, true),
  ]);

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

      {myRecipes.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon name="recipe" className="text-3xl text-[var(--color-text-muted)] mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            Crea tu primera receta combinando varios ingredientes — bowls, sopas, batidos, lo que prepares seguido.
          </p>
        </Card>
      ) : (
        <RecipeGrid recipes={myRecipes} />
      )}

      {globalRecipes.length > 0 && (
        <div className="border-t border-[var(--color-border)] pt-5 flex flex-col gap-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Icon name="star" className="text-[var(--color-plum-strong)]" /> Recetas precargadas
          </p>
          <RecipeGrid recipes={globalRecipes} />
        </div>
      )}

      <div className="border-t border-[var(--color-border)] pt-5">
        <RecipeIdeasSection />
      </div>
    </div>
  );
}
