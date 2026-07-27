"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { celebrate } from "@/lib/celebrate";

const MUSCLE_GROUPS: { value: string; label: string }[] = [
  { value: "legs", label: "Piernas" },
  { value: "glutes", label: "Glúteos" },
  { value: "quads", label: "Cuádriceps" },
  { value: "hamstrings", label: "Isquiotibiales" },
  { value: "calves", label: "Pantorrillas" },
  { value: "chest", label: "Pecho" },
  { value: "back", label: "Espalda" },
  { value: "shoulders", label: "Hombros" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Cuerpo completo" },
];

const EFFORT_OPTIONS = [
  { value: "very_light", label: "Muy suave" },
  { value: "light", label: "Suave" },
  { value: "moderate", label: "Moderado" },
  { value: "high", label: "Alto" },
  { value: "very_high", label: "Muy alto" },
];

const ROUTINE_OPTIONS = [
  { value: "traditional", label: "Tradicional" },
  { value: "circuit", label: "Circuito" },
  { value: "full_body", label: "Cuerpo completo" },
];

interface SetRow {
  exerciseName: string;
  muscleGroup: string;
  setNumber: number;
  reps: number;
  weightKg: number;
}

export default function NewStrengthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const [date, setDate] = useState(searchParams.get("date") ?? new Date().toISOString().slice(0, 10));
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [durationMin, setDurationMin] = useState(45);
  const [avgRestSec, setAvgRestSec] = useState(60);
  const [routineType, setRoutineType] = useState("traditional");
  const [effortLabel, setEffortLabel] = useState("moderate");
  const [sets, setSets] = useState<SetRow[]>([]);
  const [exerciseName, setExerciseName] = useState("");
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(20);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(!!editId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/exercise/strength/${editId}`)
      .then((r) => r.json())
      .then((data) => {
        const w = data.workout;
        if (!w) return;
        setDate(new Date(w.date).toISOString().slice(0, 10));
        setMuscleGroups(JSON.parse(w.muscleGroupsJson));
        setDurationMin(w.durationMin);
        setAvgRestSec(w.avgRestSec ?? 60);
        setRoutineType(w.routineType);
        setEffortLabel(w.effortLabel ?? "moderate");
        setSets(w.sets.map((s: SetRow) => ({ ...s })));
      })
      .finally(() => setLoadingExisting(false));
  }, [editId]);

  async function handleDelete() {
    if (!editId) return;
    setDeleting(true);
    const res = await fetch(`/api/exercise/strength/${editId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.push("/exercise");
      router.refresh();
    } else {
      setError("No pudimos eliminar el entrenamiento.");
    }
  }

  function toggleMuscle(value: string) {
    setMuscleGroups((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function addSet() {
    if (!exerciseName || muscleGroups.length === 0) return;
    const setNumber = sets.filter((s) => s.exerciseName === exerciseName).length + 1;
    setSets((prev) => [...prev, { exerciseName, muscleGroup: muscleGroups[0], setNumber, reps, weightKg }]);
  }

  function removeSet(index: number) {
    setSets((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const res = await fetch(editId ? `/api/exercise/strength/${editId}` : "/api/exercise/strength", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muscleGroups, durationMin, avgRestSec, routineType, effortLabel, sets, date }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "No pudimos guardar el entrenamiento.");
      return;
    }
    celebrate();
    router.push("/exercise");
    router.refresh();
  }

  const isToday = date === new Date().toISOString().slice(0, 10);

  if (loadingExisting) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando entrenamiento...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="pressable text-[var(--color-text-secondary)]">
          <Icon name="back" />
        </button>
        <h1 className="font-display text-2xl flex-1">{editId ? "Editar fuerza" : "Registrar fuerza"}</h1>
        {editId && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="pressable text-[var(--color-text-muted)] hover:text-[var(--color-error)] p-2 disabled:opacity-50"
            aria-label="Eliminar entrenamiento"
          >
            <Icon name="delete" />
          </button>
        )}
      </div>

      <Card className="p-5 flex flex-col gap-4">
        <div>
          <Input
            label="Fecha"
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
          {!isToday && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Estás registrando un entrenamiento de un día anterior.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Grupos musculares</p>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g.value}
                onClick={() => toggleMuscle(g.value)}
                className={`pressable px-3 py-1.5 rounded-full text-xs border ${
                  muscleGroups.includes(g.value)
                    ? "bg-[var(--color-plum)] text-white border-[var(--color-plum)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Duración (min)" type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} />
          <Input label="Descanso promedio (s)" type="number" value={avgRestSec} onChange={(e) => setAvgRestSec(Number(e.target.value))} />
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Tipo de rutina</p>
          <div className="flex gap-2">
            {ROUTINE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRoutineType(r.value)}
                className={`pressable flex-1 px-2 py-2 rounded-[var(--radius-sm)] text-xs border ${
                  routineType === r.value ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Esfuerzo percibido</p>
          <div className="flex flex-wrap gap-2">
            {EFFORT_OPTIONS.map((e) => (
              <button
                key={e.value}
                onClick={() => setEffortLabel(e.value)}
                className={`pressable px-3 py-1.5 rounded-full text-xs border ${
                  effortLabel === e.value
                    ? "bg-[var(--color-plum)] text-white border-[var(--color-plum)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold">Series (opcional)</p>
        <div className="grid grid-cols-4 gap-2">
          <input
            placeholder="Ejercicio"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            className="col-span-2 h-9 px-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)]"
          />
          <input
            type="number"
            placeholder="Reps"
            value={reps}
            onChange={(e) => setReps(Number(e.target.value))}
            className="h-9 px-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)]"
          />
          <input
            type="number"
            placeholder="Peso kg"
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            className="h-9 px-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)]"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={addSet} icon="add">
          Añadir serie
        </Button>
        {sets.length > 0 && (
          <div className="flex flex-col gap-1">
            {sets.map((s, i) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-[var(--color-border)] last:border-0">
                <span>
                  {s.exerciseName} · serie {s.setNumber}
                </span>
                <div className="flex items-center gap-2">
                  <span>
                    {s.reps} reps × {s.weightKg} kg
                  </span>
                  <button onClick={() => removeSet(i)} className="text-[var(--color-text-muted)] hover:text-[var(--color-error)]">
                    <Icon name="delete" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      <Button onClick={handleSubmit} loading={loading} disabled={muscleGroups.length === 0} icon="confirm">
        {editId ? "Guardar cambios" : "Registrar entrenamiento"}
      </Button>
    </div>
  );
}
