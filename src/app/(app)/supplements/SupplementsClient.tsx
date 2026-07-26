"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { celebrate } from "@/lib/celebrate";

interface Supplement {
  id: string;
  name: string;
  dose: number;
  unit: string;
  recommendedTime: string | null;
  proteinType: string;
  isCreatine: boolean;
  calories: number;
  proteinG: number;
  takenToday: boolean;
}

interface PresetDefaults {
  value: string;
  label: string;
  icon: IconName;
  defaultName: string;
  defaultUnit: string;
  defaultDose: number;
  defaultCalories: number;
  defaultProteinG: number;
  defaultFatG: number;
  defaultCarbsG: number;
}

// Whey scoop default: 1 scoop (~30g) ≈ 152 kcal, 22g protein, 4.3g fat, 7.2g carbs.
const PRESETS: PresetDefaults[] = [
  { value: "collagen", label: "Colágeno", icon: "collagen", defaultName: "Colágeno", defaultUnit: "g", defaultDose: 10, defaultCalories: 36, defaultProteinG: 9, defaultFatG: 0, defaultCarbsG: 0 },
  { value: "creatine", label: "Creatina", icon: "creatine", defaultName: "Creatina monohidratada", defaultUnit: "g", defaultDose: 5, defaultCalories: 0, defaultProteinG: 0, defaultFatG: 0, defaultCarbsG: 0 },
  { value: "protein_powder", label: "Proteína en polvo", icon: "protein", defaultName: "Proteína whey (1 scoop)", defaultUnit: "scoop", defaultDose: 1, defaultCalories: 152, defaultProteinG: 22, defaultFatG: 4.3, defaultCarbsG: 7.2 },
  { value: "multivitamin", label: "Multivitamínico", icon: "supplements", defaultName: "Multivitamínico", defaultUnit: "cápsula", defaultDose: 1, defaultCalories: 0, defaultProteinG: 0, defaultFatG: 0, defaultCarbsG: 0 },
  { value: "omega3", label: "Omega-3", icon: "fish", defaultName: "Omega-3", defaultUnit: "cápsula", defaultDose: 1, defaultCalories: 10, defaultProteinG: 0, defaultFatG: 1, defaultCarbsG: 0 },
  { value: "magnesium", label: "Magnesio", icon: "creatine", defaultName: "Magnesio", defaultUnit: "mg", defaultDose: 300, defaultCalories: 0, defaultProteinG: 0, defaultFatG: 0, defaultCarbsG: 0 },
  { value: "other", label: "Otro", icon: "supplements", defaultName: "", defaultUnit: "g", defaultDose: 1, defaultCalories: 0, defaultProteinG: 0, defaultFatG: 0, defaultCarbsG: 0 },
];

export function SupplementsClient({ initialSupplements }: { initialSupplements: Supplement[] }) {
  const router = useRouter();
  const [supplements, setSupplements] = useState(initialSupplements);
  const [showForm, setShowForm] = useState(false);

  async function toggleTaken(supplement: Supplement) {
    const nextTaken = !supplement.takenToday;
    setSupplements((prev) => prev.map((s) => (s.id === supplement.id ? { ...s, takenToday: nextTaken } : s)));
    const res = await fetch("/api/supplements/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplementId: supplement.id, taken: nextTaken }),
    });
    if (res.ok && nextTaken) celebrate();
    router.refresh();
  }

  const collagenAndCreatine = supplements.filter((s) => s.proteinType === "collagen" || s.isCreatine);
  const others = supplements.filter((s) => s.proteinType !== "collagen" && !s.isCreatine);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Suplementos</h1>
        <Button size="sm" icon="add" onClick={() => setShowForm(true)}>
          Añadir
        </Button>
      </div>

      {supplements.length === 0 && !showForm ? (
        <Card className="p-8 text-center">
          <Icon name="supplements" className="text-3xl text-[var(--color-text-muted)] mb-3" />
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Registra colágeno, creatina u otros suplementos que tomes regularmente.
          </p>
          <Button icon="add" onClick={() => setShowForm(true)}>
            Añadir suplemento
          </Button>
        </Card>
      ) : (
        <>
          {collagenAndCreatine.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Colágeno y creatina</p>
              <div className="flex flex-col gap-2">
                {collagenAndCreatine.map((s) => (
                  <SupplementRow key={s.id} supplement={s} onToggle={toggleTaken} />
                ))}
              </div>
            </div>
          )}
          {others.length > 0 && (
            <div>
              {collagenAndCreatine.length > 0 && (
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2 mt-2">Otros</p>
              )}
              <div className="flex flex-col gap-2">
                {others.map((s) => (
                  <SupplementRow key={s.id} supplement={s} onToggle={toggleTaken} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <NewSupplementForm
          onClose={() => setShowForm(false)}
          onCreated={(s) => {
            setSupplements((prev) => [...prev, s]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function SupplementRow({ supplement: s, onToggle }: { supplement: Supplement; onToggle: (s: Supplement) => void }) {
  return (
    <Card className="p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium flex items-center gap-1.5">
          {s.name}
          {s.proteinType === "collagen" && (
            <span className="text-[10px] text-[var(--color-lavender-strong)]">colágeno</span>
          )}
          {s.isCreatine && <span className="text-[10px] text-[var(--color-plum-strong)]">creatina</span>}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {s.dose} {s.unit}
          {s.recommendedTime ? ` · ${s.recommendedTime}` : ""}
        </p>
      </div>
      <button
        onClick={() => onToggle(s)}
        className={`pressable w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-150 ${
          s.takenToday
            ? "bg-[var(--color-mint)] border-[var(--color-mint)] text-white"
            : "border-[var(--color-border)] text-[var(--color-text-muted)]"
        }`}
        aria-label="Marcar tomado"
      >
        <Icon name="confirm" />
      </button>
    </Card>
  );
}

function NewSupplementForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (s: Supplement) => void;
}) {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [name, setName] = useState(PRESETS[0].defaultName);
  const [dose, setDose] = useState(PRESETS[0].defaultDose);
  const [unit, setUnit] = useState(PRESETS[0].defaultUnit);
  const [recommendedTime, setRecommendedTime] = useState("");
  const [calories, setCalories] = useState(PRESETS[0].defaultCalories);
  const [proteinG, setProteinG] = useState(PRESETS[0].defaultProteinG);
  const [fatG, setFatG] = useState(PRESETS[0].defaultFatG);
  const [carbsG, setCarbsG] = useState(PRESETS[0].defaultCarbsG);
  const [loading, setLoading] = useState(false);

  function selectPreset(p: PresetDefaults) {
    setPreset(p);
    setName(p.defaultName);
    setUnit(p.defaultUnit);
    setDose(p.defaultDose);
    setCalories(p.defaultCalories);
    setProteinG(p.defaultProteinG);
    setFatG(p.defaultFatG);
    setCarbsG(p.defaultCarbsG);
  }

  async function handleSubmit() {
    setLoading(true);
    const res = await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset: preset.value,
        name,
        dose,
        unit,
        recommendedTime: recommendedTime || undefined,
        calories,
        proteinG,
        fatG,
        carbsG,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      onCreated({ ...data.supplement, takenToday: false });
    }
  }

  return (
    <Card className="p-5 flex flex-col gap-4">
      <p className="text-sm font-semibold">Nuevo suplemento</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => selectPreset(p)}
            className={`pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${
              preset.value === p.value ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
            }`}
          >
            <Icon name={p.icon} /> {p.label}
          </button>
        ))}
      </div>

      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Dosis" type="number" value={dose} onChange={(e) => setDose(Number(e.target.value))} />
        <Input label="Unidad" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </div>
      <Input
        label="Hora recomendada (opcional)"
        type="time"
        value={recommendedTime}
        onChange={(e) => setRecommendedTime(e.target.value)}
      />

      {preset.value !== "creatine" && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Calorías" type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} />
          <Input label="Proteína (g)" type="number" value={proteinG} onChange={(e) => setProteinG(Number(e.target.value))} />
          <Input label="Grasa (g)" type="number" value={fatG} onChange={(e) => setFatG(Number(e.target.value))} />
          <Input label="Carbohidratos (g)" type="number" value={carbsG} onChange={(e) => setCarbsG(Number(e.target.value))} />
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSubmit} loading={loading} disabled={!name} className="flex-1">
          Guardar
        </Button>
      </div>
    </Card>
  );
}
