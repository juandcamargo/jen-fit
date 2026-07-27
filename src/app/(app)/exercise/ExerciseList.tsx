"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Card } from "@/components/ui/Card";

export interface ExerciseListItem {
  id: string;
  kind: "strength" | "cardio";
  date: string;
  title: string;
  subtitle: string;
  calories: number | null;
  icon: IconName;
}

export function ExerciseList({ items: initialItems }: { items: ExerciseListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(item: ExerciseListItem) {
    setDeletingId(item.id);
    const res = await fetch(`/api/exercise/${item.kind}/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      router.refresh();
    }
    setDeletingId(null);
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Aún no registras entrenamientos esta semana. Un día de descanso también puede ser parte del progreso.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((w) => {
        const date = new Date(w.date);
        return (
          <Card key={w.id} className="p-4 flex items-center justify-between">
            <Link href={`/exercise/${w.kind}/new?id=${w.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center text-[var(--color-plum-strong)]">
                <Icon name={w.icon} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{w.title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{w.subtitle}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  {date.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                  {date.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-[var(--color-text-secondary)]">
                {w.calories != null ? `${Math.round(w.calories)} kcal` : ""}
              </span>
              <button
                onClick={() => handleDelete(w)}
                disabled={deletingId === w.id}
                className="pressable text-[var(--color-text-muted)] hover:text-[var(--color-error)] p-2"
                aria-label="Eliminar"
              >
                <Icon name="delete" />
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
