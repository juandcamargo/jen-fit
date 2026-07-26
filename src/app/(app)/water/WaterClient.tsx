"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { celebrate } from "@/lib/celebrate";

interface WaterLog {
  id: string;
  amountMl: number;
  createdAt: string;
}

interface Settings {
  reminderStart: string;
  reminderEnd: string;
  remindersOn: boolean;
  nightPause: boolean;
}

const QUICK_ADDS = [250, 350, 500];

function addDaysToKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function WaterClient({
  logs: initialLogs,
  goalMl: initialGoal,
  settings,
  streak,
  dateKey,
  isToday,
}: {
  logs: WaterLog[];
  goalMl: number;
  settings: Settings | null;
  streak: number;
  dateKey: string;
  isToday: boolean;
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [goalMl, setGoalMl] = useState(initialGoal);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [remindersOn, setRemindersOn] = useState(settings?.remindersOn ?? true);
  const [reminderStart, setReminderStart] = useState(settings?.reminderStart ?? "08:00");
  const [reminderEnd, setReminderEnd] = useState(settings?.reminderEnd ?? "21:00");
  const [nightPause, setNightPause] = useState(settings?.nightPause ?? true);

  const totalMl = logs.reduce((s, l) => s + l.amountMl, 0);
  const percent = goalMl > 0 ? (totalMl / goalMl) * 100 : 0;

  async function addWater(amount: number) {
    if (amount <= 0) return;
    setLoading(true);
    const wasComplete = totalMl >= goalMl;
    const res = await fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountMl: amount, date: dateKey }),
    });
    if (res.ok) {
      setLogs((prev) => [...prev, { id: crypto.randomUUID(), amountMl: amount, createdAt: new Date().toISOString() }]);
      if (!wasComplete && totalMl + amount >= goalMl) celebrate();
    }
    setLoading(false);
  }

  async function saveSettings() {
    setLoading(true);
    await fetch("/api/water/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyGoalMl: goalMl, reminderStart, reminderEnd, remindersOn, nightPause }),
    });
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push(`/water?date=${addDaysToKey(dateKey, -1)}`)} className="pressable text-[var(--color-text-secondary)] p-1.5">
          <Icon name="chevronLeft" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl">{isToday ? "Hidratación" : "Hidratación"}</h1>
          {!isToday && (
            <p className="text-xs text-[var(--color-text-muted)] capitalize">
              {new Date(`${dateKey}T00:00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          )}
        </div>
        <button
          onClick={() => router.push(`/water?date=${addDaysToKey(dateKey, 1)}`)}
          disabled={addDaysToKey(dateKey, 1) > new Date().toISOString().slice(0, 10)}
          className="pressable text-[var(--color-text-secondary)] p-1.5 disabled:opacity-30"
        >
          <Icon name="chevronRight" />
        </button>
      </div>
      {!isToday && (
        <Link href={`/water?date=${new Date().toISOString().slice(0, 10)}`} className="text-xs text-[var(--color-plum-strong)] hover:underline -mt-3">
          Volver a hoy
        </Link>
      )}

      <Card className="p-6 flex flex-col items-center gap-4">
        <ProgressRing percent={percent} size={160} strokeWidth={12} color="var(--color-lavender-strong)">
          <div className="text-center">
            <p className="text-2xl font-display font-semibold">{(totalMl / 1000).toFixed(2)}L</p>
            <p className="text-xs text-[var(--color-text-muted)]">de {(goalMl / 1000).toFixed(1)}L</p>
          </div>
        </ProgressRing>

        <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1.5">
          <Icon name="streak" className="text-[var(--color-coral)]" /> Racha de hidratación: {streak} días
        </p>

        <div className="flex gap-2">
          {QUICK_ADDS.map((amount) => (
            <button
              key={amount}
              onClick={() => addWater(amount)}
              disabled={loading}
              className="pressable px-4 py-2 rounded-full bg-[var(--color-bg-alt)] text-[var(--color-plum-strong)] font-medium text-sm disabled:opacity-50"
            >
              +{amount} ml
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full max-w-xs">
          <Input
            type="number"
            placeholder="Cantidad personalizada (ml)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
          <Button
            onClick={() => {
              addWater(Number(customAmount));
              setCustomAmount("");
            }}
            disabled={!customAmount}
          >
            <Icon name="add" />
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold mb-3">{isToday ? "Registros de hoy" : "Registros de este día"}</p>
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Aún no hay agua registrada.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {logs.map((l) => (
              <span key={l.id} className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-bg-alt)] flex items-center gap-1.5">
                <Icon name="glassWater" className="text-[var(--color-lavender-strong)]" />
                {l.amountMl} ml
              </span>
            ))}
          </div>
        )}
      </Card>

      {isToday && (
        <Card className="p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold">Configuración</p>
          <Input label="Meta diaria (ml)" type="number" value={goalMl} onChange={(e) => setGoalMl(Number(e.target.value))} />

          <label className="flex items-center justify-between text-sm">
            Recordatorios activados
            <input type="checkbox" checked={remindersOn} onChange={(e) => setRemindersOn(e.target.checked)} />
          </label>

          {remindersOn && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Hora de inicio" type="time" value={reminderStart} onChange={(e) => setReminderStart(e.target.value)} />
              <Input label="Hora de fin" type="time" value={reminderEnd} onChange={(e) => setReminderEnd(e.target.value)} />
            </div>
          )}

          <label className="flex items-center justify-between text-sm">
            Pausa nocturna
            <input type="checkbox" checked={nightPause} onChange={(e) => setNightPause(e.target.checked)} />
          </label>

          <Button onClick={saveSettings} loading={loading} variant="secondary">
            Guardar configuración
          </Button>
        </Card>
      )}
    </div>
  );
}
