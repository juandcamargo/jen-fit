"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  calculateBmr,
  ageFromBirthDate,
  estimateTdee,
  calculateCalorieGoal,
  calculateProteinGoal,
  type ActivityLevel,
} from "@/lib/calculations";

type MainGoal = "lose_weight" | "reduce_fat" | "improve_habits" | "maintain_muscle" | "more_energy";
type Pace = "gradual" | "moderate" | "faster";

interface FormState {
  birthDate: string;
  heightCm: string;
  currentWeightKg: string;
  targetWeightKg: string;
  mainGoal: MainGoal | null;
  activityLevel: ActivityLevel | null;
  avgDailySteps: string;
  trainingDaysPerWeek: number;
  trainingTypes: string[];
  pace: Pace | null;
  proteinFactor: number;
  waterGoalMl: number | null;
}

const INITIAL_STATE: FormState = {
  birthDate: "",
  heightCm: "",
  currentWeightKg: "",
  targetWeightKg: "",
  mainGoal: null,
  activityLevel: null,
  avgDailySteps: "",
  trainingDaysPerWeek: 3,
  trainingTypes: [],
  pace: null,
  proteinFactor: 1.8,
  waterGoalMl: null,
};

const STEP_TITLES = [
  "Cuéntanos sobre ti",
  "¿Cuál es tu meta principal?",
  "¿Cómo es un día normal para ti?",
  "¿Entrenas actualmente?",
  "¿Qué tan rápido quieres avanzar?",
  "Tus metas iniciales",
];

const GOAL_OPTIONS: { value: MainGoal; label: string; icon: IconName }[] = [
  { value: "lose_weight", label: "Perder peso", icon: "weight" },
  { value: "reduce_fat", label: "Bajar porcentaje de grasa", icon: "chartSimple" },
  { value: "improve_habits", label: "Mejorar hábitos", icon: "checklist" },
  { value: "maintain_muscle", label: "Mantener masa muscular mientras bajo grasa", icon: "strong" },
  { value: "more_energy", label: "Sentirme con más energía", icon: "fireCurved" },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: "sedentary", label: "Mayormente sentada", description: "Trabajo de escritorio, poco movimiento" },
  { value: "light", label: "Algo activa", description: "Caminas de vez en cuando durante el día" },
  { value: "moderate", label: "Activa", description: "Te mueves regularmente" },
  { value: "very_active", label: "Muy activa", description: "Trabajo físico o muy alto movimiento diario" },
];

const TRAINING_TYPES = [
  { value: "strength", label: "Fuerza" },
  { value: "cardio", label: "Cardio" },
  { value: "classes", label: "Clases" },
  { value: "walking", label: "Caminata" },
  { value: "pilates", label: "Pilates" },
  { value: "yoga", label: "Yoga" },
  { value: "other", label: "Otro" },
];

const PACE_OPTIONS: { value: Pace; label: string; description: string }[] = [
  { value: "gradual", label: "Muy gradual", description: "Déficit suave, ritmo cómodo" },
  { value: "moderate", label: "Moderado", description: "El equilibrio recomendado para la mayoría" },
  { value: "faster", label: "Más rápido", description: "Dentro de límites saludables" },
];

export function OnboardingWizard({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    setDirection(1);
    setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1));
  }
  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  }

  const preview = useMemo(() => {
    const heightCm = parseFloat(form.heightCm);
    const currentWeightKg = parseFloat(form.currentWeightKg);
    if (!form.birthDate || !heightCm || !currentWeightKg || !form.activityLevel) return null;

    const age = ageFromBirthDate(new Date(form.birthDate));
    const bmr = calculateBmr({ weightKg: currentWeightKg, heightCm, age });
    const tdee = estimateTdee({
      bmr,
      activityLevel: form.activityLevel,
      avgDailySteps: form.avgDailySteps ? Number(form.avgDailySteps) : undefined,
      trainingDaysPerWeek: form.trainingDaysPerWeek,
    });
    const deficitPreference = form.pace === "gradual" ? "soft" : form.pace === "faster" ? "custom" : "moderate";
    const goal = calculateCalorieGoal({
      tdee: tdee.tdeeMid,
      bmr,
      deficitPreference,
      customDeficitKcal: form.pace === "faster" ? 450 : undefined,
    });
    const protein = calculateProteinGoal({ weightKg: currentWeightKg, proteinFactor: form.proteinFactor });
    const suggestedWater = Math.min(3500, Math.max(1500, Math.round(currentWeightKg * 35)));

    return { bmr, tdee, goal, protein, suggestedWater };
  }, [form]);

  const canProceed = (() => {
    switch (step) {
      case 0:
        return !!form.birthDate && !!form.heightCm && !!form.currentWeightKg && !!form.targetWeightKg;
      case 1:
        return !!form.mainGoal;
      case 2:
        return !!form.activityLevel;
      case 3:
        return true;
      case 4:
        return !!form.pace;
      default:
        return true;
    }
  })();

  async function handleSubmit() {
    if (!preview) return;
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        birthDate: form.birthDate,
        heightCm: parseFloat(form.heightCm),
        currentWeightKg: parseFloat(form.currentWeightKg),
        targetWeightKg: parseFloat(form.targetWeightKg),
        mainGoal: form.mainGoal,
        activityLevel: form.activityLevel,
        avgDailySteps: form.avgDailySteps ? Number(form.avgDailySteps) : undefined,
        trainingDaysPerWeek: form.trainingDaysPerWeek,
        trainingTypes: form.trainingTypes,
        pace: form.pace,
        proteinFactor: form.proteinFactor,
        waterGoalMl: form.waterGoalMl ?? preview.suggestedWater,
      }),
    });
    setSubmitting(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No pudimos guardar tu información.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: "var(--gradient-hero)" }}>
      <div className="max-w-xl w-full mx-auto px-5 py-8 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full overflow-hidden bg-white/50"
            >
              <div
                className="h-full bg-[var(--color-plum)] transition-all duration-500"
                style={{ width: i <= step ? "100%" : "0%", transitionTimingFunction: "var(--ease-out)" }}
              />
            </div>
          ))}
        </div>

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-6 sm:p-8 flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="flex-1 flex flex-col"
            >
              <h1 className="font-display text-2xl mb-1">{STEP_TITLES[step]}</h1>
              {step === 0 && (
                <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                  {name ? `Hola ${name}, ` : ""}esto nos ayuda a calcular tus metas iniciales.
                </p>
              )}

              <div className="flex-1 flex flex-col gap-4">
                {step === 0 && (
                  <>
                    <Input
                      label="Fecha de nacimiento"
                      type="date"
                      value={form.birthDate}
                      onChange={(e) => update("birthDate", e.target.value)}
                    />
                    <Input
                      label="Estatura (cm)"
                      type="number"
                      value={form.heightCm}
                      onChange={(e) => update("heightCm", e.target.value)}
                    />
                    <Input
                      label="Peso actual (kg)"
                      type="number"
                      step="0.1"
                      value={form.currentWeightKg}
                      onChange={(e) => update("currentWeightKg", e.target.value)}
                    />
                    <Input
                      label="Peso objetivo (kg)"
                      type="number"
                      step="0.1"
                      value={form.targetWeightKg}
                      onChange={(e) => update("targetWeightKg", e.target.value)}
                    />
                  </>
                )}

                {step === 1 && (
                  <div className="grid gap-3">
                    {GOAL_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        icon={opt.icon}
                        label={opt.label}
                        selected={form.mainGoal === opt.value}
                        onClick={() => update("mainGoal", opt.value)}
                      />
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <>
                    <div className="grid gap-3">
                      {ACTIVITY_OPTIONS.map((opt) => (
                        <OptionCard
                          key={opt.value}
                          label={opt.label}
                          description={opt.description}
                          selected={form.activityLevel === opt.value}
                          onClick={() => update("activityLevel", opt.value)}
                        />
                      ))}
                    </div>
                    <Input
                      label="Pasos promedio al día (opcional)"
                      type="number"
                      value={form.avgDailySteps}
                      onChange={(e) => update("avgDailySteps", e.target.value)}
                      hint="Si no lo sabes, déjalo en blanco"
                    />
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                        Días de entrenamiento por semana: {form.trainingDaysPerWeek}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={7}
                        value={form.trainingDaysPerWeek}
                        onChange={(e) => update("trainingDaysPerWeek", Number(e.target.value))}
                        className="w-full mt-2 accent-[var(--color-plum)]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TRAINING_TYPES.map((t) => {
                        const selected = form.trainingTypes.includes(t.value);
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() =>
                              update(
                                "trainingTypes",
                                selected
                                  ? form.trainingTypes.filter((v) => v !== t.value)
                                  : [...form.trainingTypes, t.value]
                              )
                            }
                            className={`pressable px-4 py-2 rounded-full text-sm border transition-colors duration-150 ${
                              selected
                                ? "bg-[var(--color-plum)] text-white border-[var(--color-plum)]"
                                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                            }`}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {step === 4 && (
                  <div className="grid gap-3">
                    {PACE_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        label={opt.label}
                        description={opt.description}
                        selected={form.pace === opt.value}
                        onClick={() => update("pace", opt.value)}
                      />
                    ))}
                  </div>
                )}

                {step === 5 && preview && (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Estas son estimaciones iniciales — se irán ajustando con tus datos reales.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Stat label="Metabolismo basal" value={`${preview.bmr.toFixed(0)} kcal`} />
                      <Stat label="Mantenimiento (TDEE)" value={`${preview.tdee.tdeeMid} kcal`} />
                      <Stat label="Meta calórica" value={`${preview.goal.goalCalories} kcal`} />
                      <Stat label="Pérdida semanal estimada" value={`${preview.goal.estimatedWeeklyLossKg} kg`} />
                      <Stat label="Meta de proteína" value={`${preview.protein.proteinGoalG} g`} />
                      <Stat label="Meta de agua" value={`${(form.waterGoalMl ?? preview.suggestedWater) / 1000} L`} />
                    </div>
                    {preview.goal.wasAdjusted && (
                      <p className="text-xs text-[var(--color-coral)] bg-[var(--color-coral-soft)] rounded-[var(--radius-md)] p-3">
                        {preview.goal.adjustmentMessage}
                      </p>
                    )}
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
                        onChange={(e) => update("proteinFactor", Number(e.target.value))}
                        className="w-full mt-2 accent-[var(--color-plum)]"
                      />
                    </div>
                    <Input
                      label="Meta de agua (ml)"
                      type="number"
                      value={form.waterGoalMl ?? preview.suggestedWater}
                      onChange={(e) => update("waterGoalMl", Number(e.target.value))}
                    />
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Tu metabolismo basal representa la energía aproximada que tu cuerpo utiliza en reposo.
                    </p>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-[var(--color-error)] mt-4">{error}</p>}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
            {step > 0 && (
              <Button variant="secondary" icon="back" onClick={goBack} disabled={submitting}>
                Atrás
              </Button>
            )}
            <div className="flex-1" />
            {step < STEP_TITLES.length - 1 ? (
              <Button onClick={goNext} disabled={!canProceed}>
                Continuar
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitting} disabled={!preview}>
                Comenzar mi día
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  icon,
  label,
  description,
  selected,
  onClick,
}: {
  icon?: IconName;
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pressable flex items-center gap-3 text-left px-4 py-3.5 rounded-[var(--radius-md)] border transition-colors duration-150 ${
        selected
          ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]"
          : "border-[var(--color-border)] hover:bg-[var(--color-bg-alt)]"
      }`}
    >
      {icon && (
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            selected ? "bg-[var(--color-plum)] text-white" : "bg-[var(--color-bg-alt)] text-[var(--color-plum-strong)]"
          }`}
        >
          <Icon name={icon} />
        </span>
      )}
      <span className="flex-1">
        <span className="block text-sm font-medium text-[var(--color-text-primary)]">{label}</span>
        {description && <span className="block text-xs text-[var(--color-text-secondary)]">{description}</span>}
      </span>
      {selected && <Icon name="confirm" className="text-[var(--color-plum)]" />}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-alt)] px-3.5 py-3">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className="text-lg font-semibold font-display">{value}</p>
    </div>
  );
}
