import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { RecipeIdeasSection } from "./RecipeIdeasSection";
import { MyRecipesGrid } from "./MyRecipesGrid";

export default async function RecipesPage() {
  const { session } = await requireOnboardedUser();
  const myRecipes = await prisma.recipe.findMany({
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

      <MyRecipesGrid
        recipes={myRecipes.map((r) => ({
          id: r.id,
          name: r.name,
          servings: r.servings,
          totalCalories: r.ingredients.reduce((s, i) => s + (i.foodItem.caloriesPer100g * i.quantityG) / 100, 0),
          ingredientNames: r.ingredients.map((i) => i.foodItem.name),
        }))}
      />

      <div className="border-t border-[var(--color-border)] pt-5">
        <RecipeIdeasSection />
      </div>
    </div>
  );
}
