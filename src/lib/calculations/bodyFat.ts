/**
 * Body-fat % estimation for women via circumference measurements
 * (spec section 32). All inputs in centimeters, consistently.
 *
 * %fat = 495 / (1.29579 - 0.35004*log10(waist + hip - neck) + 0.22100*log10(height)) - 450
 *
 * This is an estimate meant to track trend over time, not a diagnostic
 * measurement — always surface it alongside that disclaimer in the UI.
 */
export function estimateBodyFatPercent({
  waistCm,
  hipCm,
  neckCm,
  heightCm,
}: {
  waistCm: number
  hipCm: number
  neckCm: number
  heightCm: number
}): number | null {
  const circumferenceSum = waistCm + hipCm - neckCm
  if (circumferenceSum <= 0 || heightCm <= 0) return null

  const denominator =
    1.29579 - 0.35004 * Math.log10(circumferenceSum) + 0.221 * Math.log10(heightCm)
  if (denominator === 0) return null

  const bodyFatPercent = 495 / denominator - 450
  if (!Number.isFinite(bodyFatPercent) || bodyFatPercent <= 0 || bodyFatPercent >= 70) return null

  return Number(bodyFatPercent.toFixed(1))
}
