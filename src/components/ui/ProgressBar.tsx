"use client";

interface ProgressBarProps {
  percent: number;
  color?: string;
  trackColor?: string;
  heightPx?: number;
  className?: string;
}

export function ProgressBar({
  percent,
  color = "var(--color-plum)",
  trackColor = "var(--color-plum-soft)",
  heightPx = 10,
  className = "",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const isOverGoal = percent > 100;
  return (
    <div
      className={`w-full rounded-full overflow-hidden ${className}`}
      style={{ height: heightPx, background: trackColor }}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${clamped}%`,
          background: isOverGoal ? "var(--color-coral)" : color,
          transition: "width 500ms var(--ease-out), background 300ms ease",
        }}
      />
    </div>
  );
}
