"use client";

import { useEffect, useState } from "react";

interface ProgressRingProps {
  percent: number; // 0-100, can exceed 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 10,
  color = "var(--color-plum)",
  trackColor = "var(--color-border)",
  children,
}: ProgressRingProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimatedPercent(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  const offset = circumference - (animatedPercent / 100) * circumference;
  const isOverGoal = percent > 100;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isOverGoal ? "var(--color-coral)" : color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms var(--ease-out), stroke 300ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
