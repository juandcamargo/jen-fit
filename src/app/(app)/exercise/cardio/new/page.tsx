"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { celebrate } from "@/lib/celebrate";

const CARDIO_TYPES: { value: string; label: string; icon: IconName }[] = [
  { value: "walk", label: "Caminata", icon: "walk" },
  { value: "incline_walk", label: "Caminata inclinada", icon: "walk" },
  { value: "run", label: "Correr", icon: "cardio" },
  { value: "bike", label: "Bicicleta", icon: "bike" },
  { value: "elliptical", label: "Elíptica", icon: "cardio" },
  { value: "stairmaster", label: "Escaladora", icon: "stairs" },
  { value: "row", label: "Remo", icon: "cardio" },
  { value: "swim", label: "Natación", icon: "swim" },
  { value: "dance", label: "Baile", icon: "cardio" },
  { value: "class", label: "Clase grupal", icon: "cardio" },
  { value: "hiit", label: "HIIT", icon: "creatine" },
  { value: "other", label: "Otro", icon: "cardio" },
];

const EFFORT_OPTIONS = [
  { value: "light", label: "Suave", hint: "puedes hablar normalmente" },
  { value: "moderate", label: "Moderado", hint: "frases cortas" },
  { value: "high", label: "Alto", hint: "hablar es difícil" },
  { value: "very_high", label: "Muy alto", hint: "intervalos exigentes" },
];

export default function NewCardioPage() {
  const router = useRouter();
  const [type, setType] = useState("walk");
  const [minutes, setMinutes] = useState(30);
  const [effort, setEffort] = useState("moderate");
  const [distanceKm, setDistanceKm] = useState("");
  const [inclinePercent, setInclinePercent] = useState("");
  const [avgHeartRate, setAvgHeartRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/exercise/cardio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        minutes,
        effort,
        distanceKm: distanceKm ? Number(distanceKm) : undefined,
        inclinePercent: inclinePercent ? Number(inclinePercent) : undefined,
        avgHeartRate: avgHeartRate ? Number(avgHeartRate) : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "No pudimos guardar la sesión.");
      return;
    }
    celebrate();
    router.push("/exercise");
    router.refresh();
  }

  const showIncline = type === "walk" || type === "incline_walk" || type === "stairmaster";

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="pressable text-[var(--color-text-secondary)]">
          <Icon name="back" />
        </button>
        <h1 className="font-display text-2xl">Registrar cardio</h1>
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Tipo</p>
          <div className="grid grid-cols-3 gap-2">
            {CARDIO_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`pressable flex flex-col items-center gap-1 py-2.5 rounded-[var(--radius-md)] border text-xs ${
                  type === t.value ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
                }`}
              >
                <Icon name={t.icon} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Input label="Minutos" type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />

        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Esfuerzo percibido</p>
          <div className="flex flex-col gap-1.5">
            {EFFORT_OPTIONS.map((e) => (
              <button
                key={e.value}
                onClick={() => setEffort(e.value)}
                className={`pressable flex justify-between px-3 py-2 rounded-[var(--radius-md)] border text-sm ${
                  effort === e.value ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
                }`}
              >
                <span>{e.label}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{e.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Distancia (km, opcional)"
            type="number"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
          />
          {showIncline && (
            <Input
              label="Inclinación % (opcional)"
              type="number"
              value={inclinePercent}
              onChange={(e) => setInclinePercent(e.target.value)}
            />
          )}
          <Input
            label="Frecuencia cardiaca prom. (opcional)"
            type="number"
            value={avgHeartRate}
            onChange={(e) => setAvgHeartRate(e.target.value)}
          />
        </div>
      </Card>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      <Button onClick={handleSubmit} loading={loading} icon="confirm">
        Registrar sesión
      </Button>
    </div>
  );
}
