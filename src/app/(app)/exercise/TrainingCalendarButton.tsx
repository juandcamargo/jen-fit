"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { TrainingCalendarMonth } from "@/lib/trainingCalendar";

export function TrainingCalendarButton({ calendar }: { calendar: TrainingCalendarMonth }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pressable w-9 h-9 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] flex items-center justify-center"
        aria-label="Ver calendario de entrenamientos"
      >
        <Icon name="calendar" />
      </button>
      {open && <CalendarModal calendar={calendar} onClose={() => setOpen(false)} />}
    </>
  );
}

function CalendarModal({ calendar, onClose }: { calendar: TrainingCalendarMonth; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-lg)]"
        style={{ animation: "slide-up 250ms var(--ease-drawer, ease-out)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Icon name="calendar" className="text-[var(--color-plum-strong)]" /> Días entrenados este mes
          </p>
          <button onClick={onClose} className="pressable text-[var(--color-text-secondary)] p-1.5" aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1 mb-3">
          <Link
            href={`/exercise?calMonth=${calendar.prevMonth}`}
            className="pressable text-[var(--color-text-secondary)] p-1.5"
            aria-label="Mes anterior"
          >
            <Icon name="chevronLeft" />
          </Link>
          <span className="text-xs text-[var(--color-text-secondary)] capitalize w-28 text-center">
            {calendar.monthLabel}
          </span>
          <Link
            href={`/exercise?calMonth=${calendar.nextMonth}`}
            className="pressable text-[var(--color-text-secondary)] p-1.5"
            aria-label="Mes siguiente"
          >
            <Icon name="chevronRight" />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-[var(--color-text-muted)] mb-1.5">
          {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {calendar.cells.map((cell, i) => {
            if (!cell) return <div key={i} />;
            const bg = cell.trained ? "var(--color-mint)" : "var(--color-bg-alt)";
            const textColor = cell.trained ? "white" : "var(--color-text-muted)";
            return (
              <div
                key={i}
                className="aspect-square rounded-[var(--radius-sm)] flex items-center justify-center text-[11px] font-medium"
                style={{
                  background: bg,
                  color: textColor,
                  opacity: cell.isFuture ? 0.4 : 1,
                  outline: cell.isToday ? "2px solid var(--color-plum)" : undefined,
                }}
              >
                {cell.day}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 text-[11px] text-[var(--color-text-secondary)] mt-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-mint)" }} /> Entrenaste
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-bg-alt)" }} /> Sin sesión
          </span>
        </div>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
