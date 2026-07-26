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

interface MeasurementPoint {
  date: string;
  waistCm: number | null;
  bodyFatPercent: number | null;
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
  measurements,
  summaries,
  targetBodyFatPercent,
  tdeeConfidence,
  calculatedTdee,
  tdeeLastCalibratedAt,
}: {
  measurements: MeasurementPoint[];
  summaries: SummaryPoint[];
  targetBodyFatPercent: number | null;
  tdeeConfidence: string | null;
  calculatedTdee: number | null;
  tdeeLastCalibratedAt: string | null;
}) {
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState(30);
  const [showForm, setShowForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [waistInput, setWaistInput] = useState("");
  const [hipInput, setHipInput] = useState("");
  const [neckInput, setNeckInput] = useState("");
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateMsg, setCalibrateMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const cutoff = Date.now() - rangeDays * 24 * 60 * 60 * 1000;

  const bodyFatSeries = useMemo(() => {
    const filtered = measurements.filter((m) => m.bodyFatPercent != null && new Date(m.date).getTime() >= cutoff);
    const raw = filtered.map((m) => ({ date: m.date.slice(5, 10), value: m.bodyFatPercent as number }));
    return movingAverage(raw, 3);
  }, [measurements, cutoff]);

  const waistSeries = useMemo(() => {
    const filtered = measurements.filter((m) => m.waistCm != null && new Date(m.date).getTime() >= cutoff);
    return filtered.map((m) => ({ date: m.date.slice(5, 10), value: m.waistCm as number }));
  }, [measurements, cutoff]);

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

  async function saveMeasurements() {
    if (!weightInput || !waistInput || !hipInput || !neckInput) return;
    setSaving(true);
    setSaveError(null);
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weightKg: Number(weightInput),
        waistCm: Number(waistInput),
        hipCm: Number(hipInput),
        neckCm: Number(neckInput),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError("No pudimos guardar tus medidas.");
      return;
    }
    setShowForm(false);
    setWeightInput("");
    setWaistInput("");
    setHipInput("");
    setNeckInput("");
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
        <Button size="sm" icon="ruler" onClick={() => setShowForm((v) => !v)}>
          Registrar medidas
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 flex flex-col gap-3">
          <p className="text-xs text-[var(--color-text-secondary)]">
            Cintura a la altura del ombligo, cadera y cuello — para recalcular tu % de grasa. También pedimos tu
            peso porque tu metabolismo (BMR/TDEE) depende de él, aunque no sea tu métrica principal.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Peso (kg)" type="number" step="0.1" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
            <Input label="Cintura (cm)" type="number" step="0.1" value={waistInput} onChange={(e) => setWaistInput(e.target.value)} />
            <Input label="Cadera (cm)" type="number" step="0.1" value={hipInput} onChange={(e) => setHipInput(e.target.value)} />
            <Input label="Cuello (cm)" type="number" step="0.1" value={neckInput} onChange={(e) => setNeckInput(e.target.value)} />
          </div>
          {saveError && <p className="text-xs text-[var(--color-error)]">{saveError}</p>}
          <Button onClick={saveMeasurements} loading={saving}>
            Guardar medidas
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
        <p className="text-sm font-semibold mb-3">% de grasa corporal</p>
        {bodyFatSeries.length < 2 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
            Registra tus medidas algunas veces más para ver la tendencia.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={bodyFatSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" width={40} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" stroke="var(--color-plum)" strokeWidth={2} dot={{ r: 3 }} name="% grasa" />
            </LineChart>
          </ResponsiveContainer>
        )}
        {targetBodyFatPercent && <p className="text-xs text-[var(--color-text-muted)] mt-2">Meta: {targetBodyFatPercent}%</p>}
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold mb-3">Cintura (a la altura del ombligo)</p>
        {waistSeries.length < 2 ? (
          <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
            Registra tu cintura algunas veces más para ver la tendencia.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={waistSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" width={40} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" stroke="var(--color-lavender-strong)" strokeWidth={2} dot={{ r: 3 }} name="Cintura (cm)" />
            </LineChart>
          </ResponsiveContainer>
        )}
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
