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

const PRESETS: { value: string; label: string; icon: IconName; defaultName: string; defaultUnit: string }[] = [
  { value: "collagen", label: "Colágeno", icon: "collagen", defaultName: "Colágeno", defaultUnit: "g" },
  { value: "creatine", label: "Creatina", icon: "creatine", defaultName: "Creatina monohidratada", defaultUnit: "g" },
  { value: "protein_powder", label: "Proteína en polvo", icon: "protein", defaultName: "Proteína whey", defaultUnit: "g" },
  { value: "multivitamin", label: "Multivitamínico", icon: "supplements", defaultName: "Multivitamínico", defaultUnit: "cápsula" },
  { value: "omega3", label: "Omega-3", icon: "fish", defaultName: "Omega-3", defaultUnit: "cápsula" },
  { value: "magnesium", label: "Magnesio", icon: "creatine", defaultName: "Magnesio", defaultUnit: "mg" },
  { value: "other", label: "Otro", icon: "supplements", defaultName: "", defaultUnit: "g" },
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
        <div className="flex flex-col gap-2">
          {supplements.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between">
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
                onClick={() => toggleTaken(s)}
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
          ))}
        </div>
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

function NewSupplementForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (s: Supplement) => void;
}) {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [name, setName] = useState(PRESETS[0].defaultName);
  const [dose, setDose] = useState(5);
  const [unit, setUnit] = useState(PRESETS[0].defaultUnit);
  const [recommendedTime, setRecommendedTime] = useState("");
  const [calories, setCalories] = useState(0);
  const [proteinG, setProteinG] = useState(0);
  const [loading, setLoading] = useState(false);

  function selectPreset(p: (typeof PRESETS)[number]) {
    setPreset(p);
    setName(p.defaultName);
    setUnit(p.defaultUnit);
  }

  async function handleSubmit() {
    setLoading(true);
    const res = await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset: preset.value, name, dose, unit, recommendedTime: recommendedTime || undefined, calories, proteinG }),
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
