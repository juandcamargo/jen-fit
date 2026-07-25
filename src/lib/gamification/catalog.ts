/**
 * Static gamification catalog (spec sections 25-26). Seeded once into the DB
 * (see prisma/seed.ts) and referenced by code everywhere else so badge/
 * challenge unlock logic never has to hardcode ids.
 */

export const LEVELS = [
  { level: 1, name: "Comienzo bonito", minPoints: 0 },
  { level: 2, name: "En movimiento", minPoints: 150 },
  { level: 3, name: "Constancia", minPoints: 400 },
  { level: 4, name: "Más fuerte", minPoints: 800 },
  { level: 5, name: "En equilibrio", minPoints: 1400 },
  { level: 6, name: "Imparable", minPoints: 2200 },
  { level: 7, name: "Mi mejor versión", minPoints: 3200 },
] as const

export function levelForPoints(totalPoints: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0]
  for (const l of LEVELS) {
    if (totalPoints >= l.minPoints) current = l
  }
  return current
}

export function nextLevel(totalPoints: number) {
  const current = levelForPoints(totalPoints)
  return LEVELS.find((l) => l.level === current.level + 1) ?? null
}

export interface BadgeDefinition {
  code: string
  name: string
  description: string
  icon: string // key from src/components/icons/Icon.tsx's ICONS map
}

export const BADGES: BadgeDefinition[] = [
  { code: "first_week", name: "Primera semana", description: "Completaste tu primera semana en Jen Fit.", icon: "calendarCheck" },
  { code: "three_day_logger", name: "Tres días registrando", description: "Registraste tus comidas tres días seguidos.", icon: "nutrition" },
  { code: "seven_day_water", name: "Siete días de agua", description: "Cumpliste tu meta de agua siete días.", icon: "water" },
  { code: "protein_goal", name: "Meta de proteína", description: "Cumpliste tu meta de proteína en un día.", icon: "protein" },
  { code: "five_workouts", name: "Cinco entrenamientos", description: "Completaste cinco entrenamientos.", icon: "strength" },
  { code: "first_recipe", name: "Primera receta", description: "Creaste tu primera receta.", icon: "book" },
  { code: "first_month", name: "Primer mes", description: "Un mes completo usando Jen Fit.", icon: "cake" },
  { code: "streak_14", name: "Racha de 14 días", description: "14 días seguidos registrando.", icon: "streak" },
  { code: "streak_30", name: "Racha de 30 días", description: "30 días seguidos registrando.", icon: "fireCurved" },
  { code: "sustainable_deficit", name: "Déficit sostenible", description: "Una semana completa dentro de tu rango de déficit.", icon: "progress" },
  { code: "stronger", name: "Más fuerte", description: "Aumentaste el peso en un ejercicio registrado.", icon: "strong" },
  { code: "better_rest", name: "Mejor descanso", description: "Registraste un día de descanso consciente.", icon: "rest" },
  { code: "creatine_consistency", name: "Constancia con creatina", description: "7 días seguidos tomando creatina.", icon: "creatine" },
]

export interface ChallengeDefinition {
  code: string
  title: string
  description: string
  icon: string
  goalType: "log_breakfast" | "protein_goal" | "water_days" | "workouts" | "steps" | "home_meal" | "supplements"
  goalValue: number
  durationDays: number
}

export const CHALLENGES: ChallengeDefinition[] = [
  { code: "breakfast_5", title: "Desayuno consciente", description: "Registra el desayuno durante cinco días.", icon: "sun", goalType: "log_breakfast", goalValue: 5, durationDays: 7 },
  { code: "protein_4", title: "Semana proteica", description: "Cumple tu meta de proteína cuatro días.", icon: "protein", goalType: "protein_goal", goalValue: 4, durationDays: 7 },
  { code: "water_7", title: "Bien hidratada", description: "Toma agua suficiente durante siete días.", icon: "water", goalType: "water_days", goalValue: 7, durationDays: 7 },
  { code: "workouts_3", title: "Tres movimientos", description: "Completa tres entrenamientos.", icon: "strength", goalType: "workouts", goalValue: 3, durationDays: 7 },
  { code: "steps_extra", title: "Un paso más", description: "Camina 1.000 pasos más que tu promedio.", icon: "walk", goalType: "steps", goalValue: 1000, durationDays: 5 },
  { code: "home_meal_1", title: "Cocina casera", description: "Prepara una comida casera.", icon: "recipe", goalType: "home_meal", goalValue: 1, durationDays: 7 },
  { code: "supplements_week", title: "Suplementos al día", description: "Registra tus suplementos una semana.", icon: "supplements", goalType: "supplements", goalValue: 7, durationDays: 7 },
]
