"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/icons/Icon";

interface WeightPoint {
  date: string;
  weightKg: number;
}
interface SummaryPoint {
  date: string;
  deficitOrSurplus: number;
  caloriesConsumed: number;
  caloriesGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  waterConsumedMl: number;
  waterGoalMl: number;
}

const RANGES = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
  { label: "1 año", days: 365 },
];

function movingAverage(points: { date: string; value: number }[], window: number) {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((s, x) => s + x.value, 0) / slice.length;
    return { date: p.date, value: Number(avg.toFixed(1)) };
  });
}

export function ProgressClient({
  weightLogs,
  summaries,
  targetWeightKg,
  tdeeConfidence,
  calculatedTdee,
  tdeeLastCalibratedAt,
}: {
  weightLogs: WeightPoint[];
  summaries: SummaryPoint[];
  targetWeightKg: number | null;
  tdeeConfidence: string | null;
  calculatedTdee: number | null;
  tdeeLastCalibratedAt: string | null;
}) {
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState(30);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateMsg, setCalibrateMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;

  const weightSeries = useMemo(() => {
    const filtered = weightLogs.filter((w) => new Date(w.date).getTime() >= cutoff);
    const raw = filtered.map((w) => ({ date: w.date.slice(5, 10), value: w.weightKg }));
    return movingAverage(raw, 7);
  }, [weightLogs, cutoff]);

  const deficitSeries = useMemo(
    () =>
      summaries
        .filter((s) => new Date(s.date).getTime() >= cutoff)
        .map((s) => ({ date: s.date.slice(5, 10), deficit: -s.deficitOrSurplus })),
    [summaries, cutoff]
  );

  const filteredSummaries = summaries.filter((s) => new Date(s.date).getTime() >= cutoff);
  const daysInDeficit = filteredSummaries.filter((s) => s.deficitOrSurplus < -50).length;
  const daysInSurplus = filteredSummaries.filter((s) => s.deficitOrSurplus > 50).length;
  const avgProteinPct =
    filteredSummaries.length > 0
      ? Math.round(
          (filteredSummaries.reduce((s, d) => s + (d.proteinGoal ? d.proteinConsumed / d.proteinGoal : 0), 0) /
            filteredSummaries.length) *
            100
        )
      : 0;

  async function saveWeight() {
    if (!weightInput) return;
    setSaving(true);
    await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightKg: Number(weightInput) }),
    });
    setSaving(false);
    setShowWeightForm(false);
    setWeightInput("");
    router.refresh();
  }

  async function recalibrate() {
    setCalibrating(true);
    setCalibrateMsg(null);
    const res = await fetch("/api/progress/calibrate-tdee", { method: "POST" });
    const data = await res.json();
    setCalibrating(false);
    setCalibrateMsg(data.message);
    if (data.applied) router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Tu progreso</h1>
        <Button size="sm" icon="add" onClick={() => setShowWeightForm((v) => !v)}>
          Registrar peso
        </Button>
      </div>

      {showWeightForm && (
        <Card className="p-4 flex gap-2 items-end">
          <Input label="Peso actual (kg)" type="number" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
          <Button onClick={saveWeight} loading={saving}>
            Guardar
          </Button>
        </Card>
      )}

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setRangeDays(r.days)}
            className={`pressable px-3 py-1.5 rounded-full text-xs font-medium border ${
              rangeDays === r.days
                ? "bg-[var(--color-plum)] text-white border-[var(--color-plum)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-sm font-semibold mb-3">Peso (promedio móvil de 7 días)</p>
        {weightSeries.length < 2 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
            Registra tu peso algunos días más para ver la tendencia.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weightSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" width={40} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" stroke="var(--color-plum)" strokeWidth={2} dot={false} name="Peso (kg)" />
            </LineChart>
          </ResponsiveContainer>
        )}
        {targetWeightKg && <p className="text-xs text-[var(--color-text-muted)] mt-2">Meta: {targetWeightKg} kg</p>}
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold mb-3">Déficit / superávit diario</p>
        {deficitSeries.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">Aún no hay datos suficientes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deficitSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" width={40} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="deficit" fill="var(--color-mint)" radius={[4, 4, 0, 0]} name="Déficit (kcal)" />
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-[var(--color-text-muted)] mt-2">Barras positivas = déficit; negativas = superávit.</p>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xl font-display font-semibold">{daysInDeficit}</p>
          <p className="text-[10px] text-[var(--color-text-secondary)]">días en déficit</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-display font-semibold">{daysInSurplus}</p>
          <p className="text-[10px] text-[var(--color-text-secondary)]">días en superávit</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xl font-display font-semibold">{avgProteinPct}%</p>
          <p className="text-[10px] text-[var(--color-text-secondary)]">proteína promedio</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Icon name="target" className="text-[var(--color-plum-strong)]" /> Calibración de metabolismo
          </p>
          <span className="text-xs text-[var(--color-text-muted)]">
            Confianza: {tdeeConfidence === "high" ? "alta" : tdeeConfidence === "medium" ? "media" : "baja"}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] mb-3">
          Mantenimiento estimado actual: {calculatedTdee ? Math.round(calculatedTdee) : "—"} kcal
          {tdeeLastCalibratedAt && ` · última calibración ${new Date(tdeeLastCalibratedAt).toLocaleDateString("es")}`}
        </p>
        <Button variant="secondary" size="sm" onClick={recalibrate} loading={calibrating}>
          Recalibrar con mis datos reales
        </Button>
        {calibrateMsg && <p className="text-xs text-[var(--color-text-secondary)] mt-2">{calibrateMsg}</p>}
      </Card>
    </div>
  );
}
