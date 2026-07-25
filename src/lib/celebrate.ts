import confetti from "canvas-confetti";

/**
 * Moderate celebratory confetti for goal completions (spec: "confeti
 * moderado", not full-screen chaos). Colors match the brand palette.
 */
export function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  confetti({
    particleCount: 60,
    spread: 65,
    startVelocity: 32,
    origin: { y: 0.7 },
    colors: ["#e8afb8", "#c3b2e0", "#6f3f77", "#6fcbaa"],
    scalar: 0.9,
    ticks: 160,
  });
}
