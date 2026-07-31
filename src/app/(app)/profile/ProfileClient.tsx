"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/icons/Icon";
import { DEFICIT_PERCENT_BY_PACE, type Pace } from "@/lib/calculations";

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Mayormente sentada",
  light: "Algo activa",
  moderate: "Activa",
  very_active: "Muy activa",
};

const PACE_LABELS: Record<string, string> = {
  gradual: "Muy gradual (~12% déficit)",
  moderate: "Moderado (17% déficit)",
  faster: "Más rápido (~22% déficit)",
};

export function ProfileClient({
  email,
  name,
  currentWeightKg,
  heightCm,
  birthDate,
  bodyFatPercent,
  targetBodyFatPercent,
  waistCm,
  hipCm,
  neckCm,
  lastMeasuredAt,
  activityLevel,
  avgDailySteps,
  trainingDaysPerWeek,
  pace,
  proteinFactor,
  waterGoalMl,
  calculatedBmr,
  calculatedTdee,
}: {
  email: string;
  name: string;
  currentWeightKg: number | null;
  heightCm: number | null;
  birthDate: string | null;
  bodyFatPercent: number | null;
  targetBodyFatPercent: number | null;
  waistCm: number | null;
  hipCm: number | null;
  neckCm: number | null;
  lastMeasuredAt: string | null;
  activityLevel: string;
  avgDailySteps: number | null;
  trainingDaysPerWeek: number | null;
  pace: string;
  proteinFactor: number;
  waterGoalMl: number;
  calculatedBmr: number | null;
  calculatedTdee: number | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    targetBodyFatPercent: targetBodyFatPercent ?? 0,
    activityLevel,
    pace,
    trainingDaysPerWeek: trainingDaysPerWeek ?? 0,
    proteinFactor,
    waterGoalMl,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [vitals, setVitals] = useState({
    weightKg: currentWeightKg != null ? String(currentWeightKg) : "",
    waistCm: waistCm != null ? String(waistCm) : "",
    hipCm: hipCm != null ? String(hipCm) : "",
    neckCm: neckCm != null ? String(neckCm) : "",
    heightCm: heightCm != null ? String(heightCm) : "",
    birthDate: birthDate ?? "",
  });
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsSaved, setVitalsSaved] = useState(false);
  const [vitalsError, setVitalsError] = useState<string | null>(null);

  const daysSinceMeasured = lastMeasuredAt
    ? Math.floor((Date.now() - new Date(lastMeasuredAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const deficitRange = useMemo(() => {
    if (!calculatedTdee) return null;
    const gradualKcal = Math.round(calculatedTdee * DEFICIT_PERCENT_BY_PACE.gradual);
    const fasterKcal = Math.round(calculatedTdee * DEFICIT_PERCENT_BY_PACE.faster);
    const currentKcal = Math.round(calculatedTdee * DEFICIT_PERCENT_BY_PACE[form.pace as Pace]);
    return { gradualKcal, fasterKcal, currentKcal };
  }, [calculatedTdee, form.pace]);

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

  async function handleSaveVitals() {
    if (!vitals.weightKg) {
      setVitalsError("Indica al menos tu peso actual.");
      return;
    }
    setSavingVitals(true);
    setVitalsSaved(false);
    setVitalsError(null);

    const weightRes = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weightKg: Number(vitals.weightKg),
        ...(vitals.waistCm ? { waistCm: Number(vitals.waistCm) } : {}),
        ...(vitals.hipCm ? { hipCm: Number(vitals.hipCm) } : {}),
        ...(vitals.neckCm ? { neckCm: Number(vitals.neckCm) } : {}),
      }),
    });

    if (!weightRes.ok) {
      setSavingVitals(false);
      setVitalsError("No pudimos guardar tu peso y medidas.");
      return;
    }

    if (vitals.heightCm || vitals.birthDate) {
      const profileRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(vitals.heightCm ? { heightCm: Number(vitals.heightCm) } : {}),
          ...(vitals.birthDate ? { birthDate: vitals.birthDate } : {}),
        }),
      });
      if (!profileRes.ok) {
        setSavingVitals(false);
        setVitalsError("Guardamos tu peso y medidas, pero no pudimos actualizar altura/fecha de nacimiento.");
        return;
      }
    }

    setSavingVitals(false);
    setVitalsSaved(true);
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

  async function handleReset() {
    setResetting(true);
    setResetError(null);
    const res = await fetch("/api/account/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setResetError(data.error ?? "No pudimos restablecer tus datos.");
      setResetting(false);
      return;
    }
    setResetting(false);
    setResetDone(true);
    setResetPassword("");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <h1 className="font-display text-2xl">Tu perfil</h1>

      <Card className="p-5 flex flex-col gap-3 border-[var(--color-mint)]">
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
          Tu meta principal
        </p>
        <p className="text-sm font-semibold flex items-center gap-2">
          <Icon name="balance" className="text-[var(--color-mint)]" /> Rango de déficit calórico diario
        </p>
        {deficitRange ? (
          <>
            <p className="text-3xl font-display font-semibold text-[var(--color-mint)]">
              {deficitRange.gradualKcal}–{deficitRange.fasterKcal} <span className="text-base font-sans text-[var(--color-text-muted)]">kcal/día</span>
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Según tu TDEE actual ({Math.round(calculatedTdee!)} kcal) y un ritmo entre muy gradual (12%) y más
              rápido (22%). Tu ritmo elegido ({PACE_LABELS[form.pace]}) apunta a{" "}
              <span className="font-semibold text-[var(--color-text-primary)]">{deficitRange.currentKcal} kcal/día</span> de déficit.
            </p>
          </>
        ) : (
          <p className="text-xs text-[var(--color-text-secondary)]">
            Completa tu peso, altura y fecha de nacimiento abajo para calcular tu rango de déficit.
          </p>
        )}
      </Card>

      <Card className="p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{email}</p>
        {calculatedBmr && calculatedTdee && (
          <div className="flex gap-4 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-alt)] rounded-[var(--radius-md)] p-3">
            <span>BMR: {Math.round(calculatedBmr)} kcal</span>
            <span>TDEE: {Math.round(calculatedTdee)} kcal</span>
          </div>
        )}
        <div className="flex gap-4 text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-alt)] rounded-[var(--radius-md)] p-3">
          <span>% grasa actual: {bodyFatPercent != null ? `${bodyFatPercent}%` : "—"}</span>
          <span>Cintura: {waistCm != null ? `${waistCm} cm` : "—"}</span>
        </div>
        {daysSinceMeasured != null && daysSinceMeasured >= 7 && (
          <p className="text-xs text-[var(--color-coral)] bg-[var(--color-coral-soft)] rounded-[var(--radius-md)] p-3 flex items-center gap-2">
            <Icon name="ruler" />
            Han pasado {daysSinceMeasured} días desde tu última medida — es buen momento para volver a medirte.
          </p>
        )}
      </Card>

      <Card className="p-5 flex flex-col gap-4 border-[var(--color-plum)]">
        <div className="flex items-center gap-2">
          <Icon name="ruler" className="text-[var(--color-plum-strong)]" />
          <p className="text-sm font-semibold">Peso y medidas</p>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Estos datos son la base de tu cálculo de gasto calórico (BMR/TDEE) y de tu % de grasa. Mantenlos
          actualizados — cada cambio queda registrado en tu progreso.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Peso actual (kg)"
            type="number"
            step="0.1"
            value={vitals.weightKg}
            onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })}
          />
          <Input
            label="Altura (cm)"
            type="number"
            step="0.5"
            value={vitals.heightCm}
            onChange={(e) => setVitals({ ...vitals, heightCm: e.target.value })}
          />
          <Input
            label="Cintura (cm)"
            type="number"
            step="0.1"
            value={vitals.waistCm}
            onChange={(e) => setVitals({ ...vitals, waistCm: e.target.value })}
          />
          <Input
            label="Cadera (cm)"
            type="number"
            step="0.1"
            value={vitals.hipCm}
            onChange={(e) => setVitals({ ...vitals, hipCm: e.target.value })}
          />
          <Input
            label="Cuello (cm)"
            type="number"
            step="0.1"
            value={vitals.neckCm}
            onChange={(e) => setVitals({ ...vitals, neckCm: e.target.value })}
          />
          <Input
            label="Fecha de nacimiento"
            type="date"
            value={vitals.birthDate}
            onChange={(e) => setVitals({ ...vitals, birthDate: e.target.value })}
          />
        </div>

        {vitalsError && <p className="text-xs text-[var(--color-error)]">{vitalsError}</p>}
        <Button onClick={handleSaveVitals} loading={savingVitals} icon="confirm">
          Guardar mis datos
        </Button>
        {vitalsSaved && <p className="text-xs text-[var(--color-mint)]">Datos actualizados y registrados en tu progreso.</p>}
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <p className="text-sm font-semibold">Metas</p>
        <Input
          label="% de grasa objetivo"
          type="number"
          step="0.5"
          value={form.targetBodyFatPercent}
          onChange={(e) => setForm({ ...form, targetBodyFatPercent: Number(e.target.value) })}
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
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
            Ritmo del déficit calórico (tu métrica principal)
          </p>
          <div className="flex flex-col gap-2">
            {Object.entries(PACE_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setForm({ ...form, pace: value })}
                className={`pressable py-2 px-3 rounded-[var(--radius-md)] border text-xs text-left ${
                  form.pace === value ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
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

      <Card id="reset" className="p-5 flex flex-col gap-3 border-[var(--color-coral)]">
        <p className="text-sm font-semibold text-[var(--color-coral)]">Restablecer datos</p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Borra tu historial (comidas, agua, ejercicio, peso, suplementos, rachas, insignias, retos y puntos), pero
          mantiene tu cuenta y tus metas configuradas. Confirma tu contraseña para continuar.
        </p>
        <Input
          type="password"
          placeholder="Contraseña"
          icon="lock"
          value={resetPassword}
          onChange={(e) => setResetPassword(e.target.value)}
        />
        {resetError && <p className="text-xs text-[var(--color-error)]">{resetError}</p>}
        {resetDone && <p className="text-xs text-[var(--color-mint)]">Datos restablecidos.</p>}
        <Button
          onClick={handleReset}
          loading={resetting}
          disabled={!resetPassword}
          className="!bg-[var(--color-coral)] text-white"
        >
          Restablecer mis datos
        </Button>
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
