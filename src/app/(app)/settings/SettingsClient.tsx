"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme, type ThemePreference } from "@/components/theme/useTheme";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/icons/Icon";

interface NotificationItem {
  type: string;
  enabled: boolean;
  time: string | null;
  label: string;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: "sun" | "moon" | "sliders" }[] = [
  { value: "light", label: "Claro", icon: "sun" },
  { value: "dark", label: "Oscuro", icon: "moon" },
  { value: "system", label: "Automático", icon: "sliders" },
];

export function SettingsClient({
  units: initialUnits,
  notifications: initialNotifications,
}: {
  units: string;
  notifications: NotificationItem[];
}) {
  const { preference, setTheme } = useTheme();
  const [units, setUnits] = useState(initialUnits);
  const [notifications, setNotifications] = useState(initialNotifications);

  async function toggleNotification(type: string) {
    const current = notifications.find((n) => n.type === type);
    const next = !current?.enabled;
    setNotifications((prev) => prev.map((n) => (n.type === type ? { ...n, enabled: next } : n)));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, enabled: next }),
    });
  }

  async function updateUnits(value: string) {
    setUnits(value);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units: value }),
    });
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
      <h1 className="font-display text-2xl">Configuración</h1>

      <Card className="p-5">
        <p className="text-sm font-semibold mb-3">Apariencia</p>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`pressable flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[var(--radius-md)] border text-xs ${
                preference === opt.value ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
              }`}
            >
              <Icon name={opt.icon} />
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold mb-3">Unidades</p>
        <div className="flex gap-2">
          {[
            { value: "metric", label: "Métrico (kg, cm)" },
            { value: "imperial", label: "Imperial (lb, in)" },
          ].map((u) => (
            <button
              key={u.value}
              onClick={() => updateUnits(u.value)}
              className={`pressable flex-1 py-2.5 rounded-[var(--radius-md)] border text-xs ${
                units === u.value ? "border-[var(--color-plum)] bg-[var(--color-plum-soft)]" : "border-[var(--color-border)]"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold mb-3">Notificaciones</p>
        <div className="flex flex-col gap-1">
          {notifications.map((n) => (
            <label key={n.type} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
              <span className="text-sm">{n.label}</span>
              <input type="checkbox" checked={n.enabled} onChange={() => toggleNotification(n.type)} />
            </label>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mt-3">
          Evitamos el exceso de notificaciones — activa solo las que te ayuden.
        </p>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold mb-3">Cuenta</p>
        <div className="flex flex-col gap-2">
          <Link href="/profile" className="text-sm text-[var(--color-plum-strong)] hover:underline">
            Editar perfil y metas
          </Link>
          <a href="/api/account/export" className="text-sm text-[var(--color-plum-strong)] hover:underline">
            Exportar mis datos
          </a>
          <Link href="/profile#delete" className="text-sm text-[var(--color-error)] hover:underline">
            Eliminar cuenta
          </Link>
        </div>
      </Card>
    </div>
  );
}
