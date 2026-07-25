/**
 * BMR — Mifflin-St Jeor equation for women.
 * BMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
 */
export function calculateBmr({
  weightKg,
  heightCm,
  age,
}: {
  weightKg: number
  heightCm: number
  age: number
}): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
    throw new Error("weightKg, heightCm and age must be positive")
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
}

export function ageFromBirthDate(birthDate: Date, onDate: Date = new Date()): number {
  let age = onDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = onDate.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && onDate.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
