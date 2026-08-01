"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { celebrate } from "@/lib/celebrate";

type Tab = "search" | "barcode" | "manual" | "recipes";

const MEAL_OPTIONS: { value: string; label: string }[] = [
  { value: "breakfast", label: "Desayuno" },
  { value: "mid_morning", label: "Media mañana" },
  { value: "lunch", label: "Almuerzo" },
  { value: "snack", label: "Merienda" },
  { value: "dinner", label: "Cena" },
  { value: "snacks", label: "Snacks" },
  { value: "drinks", label: "Bebidas" },
  { value: "supplements", label: "Suplementos" },
];

interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  isMacroConsistent: boolean;
  isVerified: boolean;
  isCollagen: boolean;
}

interface Recipe {
  id: string;
  name: string;
  servings: number;
  finalWeightG: number | null;
  mealType: string | null;
}

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "recipes", label: "Recetas", icon: "recipe" },
  { id: "search", label: "Buscar", icon: "search" },
  { id: "barcode", label: "Código de barras", icon: "scan" },
  { id: "manual", label: "Manual", icon: "edit" },
];

export function AddFoodClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("recipes");
  const [mealType, setMealType] = useState(searchParams.get("meal") ?? "breakfast");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const dateParam = searchParams.get("date");
  const foodPageHref = dateParam ? `/food?date=${dateParam}` : "/food";

  const mealSelector = (
    <div className="flex flex-wrap gap-2">
      {MEAL_OPTIONS.map((m) => (
        <button
          key={m.value}
          onClick={() => setMealType(m.value)}
          className={`pressable px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-150 ${
            mealType === m.value
              ? "bg-[var(--color-plum)] text-white border-[var(--color-plum)]"
              : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  if (selectedFood) {
    return (
      <LogPanel
        title={selectedFood.name}
        subtitle={selectedFood.brand ?? undefined}
        mealType={mealType}
        mealSelector={mealSelector}
        onBack={() => setSelectedFood(null)}
        onSubmit={async (quantityG, weightState) => {
          const res = await fetch("/api/food/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ foodItemId: selectedFood.id, mealType, quantityG, weightState, date: dateParam ?? undefined }),
          });
          if (res.ok) {
            router.push(foodPageHref);
            router.refresh();
          }
          return res.ok;
        }}
        preview={(quantityG) => ({
          calories: (selectedFood.caloriesPer100g * quantityG) / 100,
          protein: (selectedFood.proteinPer100g * quantityG) / 100,
        })}
      />
    );
  }

  if (selectedRecipe) {
    return (
      <LogPanel
        title={selectedRecipe.name}
        subtitle={`${selectedRecipe.servings} porciones`}
        mealType={mealType}
        mealSelector={mealSelector}
        onBack={() => setSelectedRecipe(null)}
        defaultQuantityG={
          selectedRecipe.finalWeightG ? Math.round(selectedRecipe.finalWeightG / selectedRecipe.servings) : 250
        }
        onSubmit={async (quantityG) => {
          const res = await fetch("/api/food/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipeId: selectedRecipe.id, mealType, quantityG, date: dateParam ?? undefined }),
          });
          if (res.ok) {
            router.push(foodPageHref);
            router.refresh();
          }
          return res.ok;
        }}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="pressable text-[var(--color-text-secondary)]">
          <Icon name="back" />
        </button>
        <h1 className="font-display text-2xl">Registrar comida</h1>
      </div>

      <div>
        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Comida</p>
        {mealSelector}
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pressable flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors duration-150 ${
              tab === t.id
                ? "border-[var(--color-plum)] text-[var(--color-plum-strong)]"
                : "border-transparent text-[var(--color-text-muted)]"
            }`}
          >
            <Icon name={t.icon} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "search" && <SearchTab onSelect={setSelectedFood} />}
      {tab === "barcode" && <BarcodeTab onSelect={setSelectedFood} />}
      {tab === "manual" && <ManualTab onCreated={setSelectedFood} />}
      {tab === "recipes" && <RecipesTab mealType={mealType} onSelect={setSelectedRecipe} />}
    </div>
  );
}

function SearchTab({ onSelect }: { onSelect: (f: FoodItem) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        if (data.providerError) setError("No se pudo consultar la fuente externa, mostrando resultados locales.");
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <Input
        icon="search"
        placeholder="Buscar alimento o marca..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {loading && <p className="text-sm text-[var(--color-text-muted)]">Buscando...</p>}
      {error && <p className="text-xs text-[var(--color-coral)]">{error}</p>}
      <div className="flex flex-col gap-2">
        {results.map((f) => (
          <FoodResultRow key={f.id} food={f} onClick={() => onSelect(f)} />
        ))}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
            No encontramos nada. Prueba con &quot;Manual&quot; para crearlo tú misma.
          </p>
        )}
      </div>
    </div>
  );
}

function BarcodeTab({ onSelect }: { onSelect: (f: FoodItem) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLookup() {
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/food/barcode/${encodeURIComponent(code.trim())}`);
    const data = await res.json();
    setLoading(false);
    if (data.result) {
      onSelect(data.result);
    } else {
      setMessage(data.message ?? data.error ?? "No encontramos este producto.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--color-text-muted)]">
        Ingresa el código de barras del producto (la captura por cámara requiere acceso al dispositivo).
      </p>
      <div className="flex gap-2">
        <Input
          icon="scan"
          placeholder="7501234567890"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleLookup} loading={loading}>
          Buscar
        </Button>
      </div>
      {message && <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>}
    </div>
  );
}

function ManualTab({ onCreated }: { onCreated: (f: FoodItem) => void }) {
  const [basis, setBasis] = useState<"per_100g" | "per_serving">("per_100g");
  const [form, setForm] = useState({
    name: "",
    brand: "",
    servingSizeG: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    isCollagen: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/food/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        brand: form.brand || undefined,
        basis,
        servingSizeG: form.servingSizeG ? Number(form.servingSizeG) : undefined,
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat),
        fiber: form.fiber ? Number(form.fiber) : undefined,
        isCollagen: form.isCollagen,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "No pudimos guardar el alimento.");
      return;
    }
    onCreated(data.result);
  }

  return (
    <div className="flex flex-col gap-3">
      <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input label="Marca (opcional)" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />

      <div className="flex gap-2">
        {(["per_100g", "per_serving"] as const).map((b) => (
          <button
            key={b}
            onClick={() => setBasis(b)}
            className={`pressable flex-1 px-3 py-2 rounded-[var(--radius-md)] text-sm border ${
              basis === b ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
            }`}
          >
            {b === "per_100g" ? "Por 100 g" : "Por porción"}
          </button>
        ))}
      </div>
      {basis === "per_serving" && (
        <Input
          label="Tamaño de la porción (g)"
          type="number"
          value={form.servingSizeG}
          onChange={(e) => setForm({ ...form, servingSizeG: e.target.value })}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Calorías" type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} />
        <Input label="Proteína (g)" type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
        <Input label="Carbohidratos (g)" type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
        <Input label="Grasas (g)" type="number" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
        <Input label="Fibra (g, opcional)" type="number" value={form.fiber} onChange={(e) => setForm({ ...form, fiber: e.target.value })} />
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <input
          type="checkbox"
          checked={form.isCollagen}
          onChange={(e) => setForm({ ...form, isCollagen: e.target.checked })}
        />
        Es colágeno (se contará aparte de la proteína completa)
      </label>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      <Button onClick={handleSubmit} loading={loading} disabled={!form.name || !form.calories}>
        Continuar
      </Button>
    </div>
  );
}

function RecipesTab({ mealType, onSelect }: { mealType: string; onSelect: (r: Recipe) => void }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/food/recipes")
      .then((r) => r.json())
      .then((d) => setRecipes(d.recipes ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-[var(--color-text-muted)]">Cargando recetas...</p>;

  const filtered = recipes.filter((r) => r.mealType === null || r.mealType === mealType);

  return (
    <div className="flex flex-col gap-2">
      {recipes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--color-text-muted)] mb-3">Aún no tienes recetas guardadas.</p>
          <a href="/food/recipes/new">
            <Button variant="secondary" icon="add">
              Crear receta
            </Button>
          </a>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
          No tienes recetas guardadas para esta comida.
        </p>
      ) : (
        filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r)}
            className="pressable flex items-center justify-between text-left px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-bg-alt)]"
          >
            <span className="text-sm font-medium">{r.name}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{r.servings} porciones</span>
          </button>
        ))
      )}
    </div>
  );
}

function FoodResultRow({ food, onClick }: { food: FoodItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pressable flex items-center justify-between text-left px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-bg-alt)]"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium truncate flex items-center gap-1.5">
          {food.name}
          {food.isCollagen && <Icon name="collagen" className="text-[10px] text-[var(--color-lavender-strong)]" />}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] truncate">
          {food.brand ? `${food.brand} · ` : ""}
          {Math.round(food.caloriesPer100g)} kcal /100g
          {!food.isMacroConsistent && " · macros por verificar"}
        </p>
      </div>
      <Icon name="add" className="text-[var(--color-plum-strong)] shrink-0 ml-2" />
    </button>
  );
}

function LogPanel({
  title,
  subtitle,
  mealType,
  mealSelector,
  onBack,
  onSubmit,
  preview,
  defaultQuantityG = 100,
}: {
  title: string;
  subtitle?: string;
  mealType: string;
  mealSelector: React.ReactNode;
  onBack: () => void;
  onSubmit: (quantityG: number, weightState: "raw" | "cooked" | "dry") => Promise<boolean>;
  preview?: (quantityG: number) => { calories: number; protein: number };
  defaultQuantityG?: number;
}) {
  const [quantityG, setQuantityG] = useState(defaultQuantityG);
  const [weightState, setWeightState] = useState<"raw" | "cooked" | "dry">("raw");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedPreview = useMemo(() => (preview ? preview(quantityG) : null), [preview, quantityG]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const ok = await onSubmit(quantityG, weightState);
    setLoading(false);
    if (ok) celebrate();
    else setError("No pudimos registrar el alimento.");
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="pressable text-[var(--color-text-secondary)]">
          <Icon name="back" />
        </button>
        <div>
          <h1 className="font-display text-xl">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
        </div>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Comida: {mealType}</p>
        {mealSelector}

        <Input
          label="Cantidad (g)"
          type="number"
          value={quantityG}
          onChange={(e) => setQuantityG(Number(e.target.value))}
        />

        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Estado</p>
          <div className="flex gap-2">
            {(["raw", "cooked", "dry"] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWeightState(w)}
                className={`pressable flex-1 px-2 py-1.5 rounded-[var(--radius-sm)] text-xs border ${
                  weightState === w ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
                }`}
              >
                {w === "raw" ? "Crudo" : w === "cooked" ? "Cocido" : "Seco"}
              </button>
            ))}
          </div>
        </div>

        {computedPreview && (
          <div className="flex gap-4 text-sm bg-[var(--color-bg-alt)] rounded-[var(--radius-md)] p-3">
            <span>{Math.round(computedPreview.calories)} kcal</span>
            <span>{Math.round(computedPreview.protein)} g proteína</span>
          </div>
        )}

        {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
        <Button onClick={handleSubmit} loading={loading} icon="confirm">
          Registrar
        </Button>
      </Card>
    </div>
  );
}
