"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/icons/Icon";

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Mayormente sentada",
  light: "Algo activa",
  moderate: "Activa",
  very_active: "Muy activa",
};

export function ProfileClient({
  email,
  name,
  targetWeightKg,
  activityLevel,
  avgDailySteps,
  trainingDaysPerWeek,
  proteinFactor,
  waterGoalMl,
  deficitPreference,
  calculatedBmr,
  calculatedTdee,
}: {
  email: string;
  name: string;
  targetWeightKg: number | null;
  activityLevel: string;
  avgDailySteps: number | null;
  trainingDaysPerWeek: number | null;
  proteinFactor: number;
  waterGoalMl: number;
  deficitPreference: string;
  calculatedBmr: number | null;
  calculatedTdee: number | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    targetWeightKg: targetWeightKg ?? 0,
    activityLevel,
    trainingDaysPerWeek: trainingDaysPerWeek ?? 0,
    proteinFactor,
    waterGoalMl,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "No pudimos eliminar tu cuenta.");
      setDeleting(false);
      return;
    }
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <h1 className="font-display text-2xl">Tu perfil</h1>

      <Card className="p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{email}</p>
        {calculatedBmr && calculatedTdee && (
          <div className="flex gap-4 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-alt)] rounded-[var(--radius-md)] p-3">
            <span>BMR: {Math.round(calculatedBmr)} kcal</span>
            <span>TDEE: {Math.round(calculatedTdee)} kcal</span>
          </div>
        )}
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <p className="text-sm font-semibold">Metas</p>
        <Input
          label="Peso objetivo (kg)"
          type="number"
          value={form.targetWeightKg}
          onChange={(e) => setForm({ ...form, targetWeightKg: Number(e.target.value) })}
        />

        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Nivel de actividad</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setForm({ ...form, activityLevel: value })}
                className={`pressable py-2 rounded-[var(--radius-md)] border text-xs ${
                  form.activityLevel === value ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Factor de proteína: {form.proteinFactor.toFixed(1)} g/kg
          </label>
          <input
            type="range"
            min={1.6}
            max={2.2}
            step={0.1}
            value={form.proteinFactor}
            onChange={(e) => setForm({ ...form, proteinFactor: Number(e.target.value) })}
            className="w-full mt-2 accent-[var(--color-plum)]"
          />
        </div>

        <Input
          label="Meta de agua (ml)"
          type="number"
          value={form.waterGoalMl}
          onChange={(e) => setForm({ ...form, waterGoalMl: Number(e.target.value) })}
        />

        <Button onClick={handleSave} loading={saving}>
          Guardar cambios
        </Button>
        {saved && <p className="text-xs text-[var(--color-mint)]">Perfil actualizado.</p>}
      </Card>

      <Card className="p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold">Privacidad y datos</p>
        <a href="/api/account/export">
          <Button variant="secondary" icon="download" className="w-full">
            Exportar mis datos
          </Button>
        </a>
      </Card>

      <Card id="delete" className="p-5 flex flex-col gap-3 border-[var(--color-error)]">
        <p className="text-sm font-semibold text-[var(--color-error)]">Eliminar cuenta</p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Esta acción es permanente y elimina todos tus datos. Confirma tu contraseña para continuar.
        </p>
        <Input
          type="password"
          placeholder="Contraseña"
          icon="lock"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
        />
        {deleteError && <p className="text-xs text-[var(--color-error)]">{deleteError}</p>}
        <Button variant="danger" onClick={handleDelete} loading={deleting} disabled={!deletePassword} icon="delete">
          Eliminar mi cuenta
        </Button>
      </Card>
    </div>
  );
}
