/**
 * Motivational copy engine (spec sections 1, 24, 27). Ground rules:
 * never blame, never call a day "failed", always foreground the weekly
 * trend over any single day, and always leave the door open for tomorrow.
 */

export interface DaySnapshot {
  deficitOrSurplus: number
  diffFromGoal: number
  proteinConsumed: number
  proteinGoal: number
  waterConsumedMl: number
  waterGoalMl: number
  hadWorkout: boolean
  loggingStreak: number
}

export function balanceMessage(day: DaySnapshot): string {
  const { diffFromGoal, deficitOrSurplus } = day
  if (diffFromGoal <= 0) {
    return "Estás dentro de tu meta calórica de hoy."
  }
  if (deficitOrSurplus < 0) {
    return `Estás ${Math.abs(diffFromGoal)} kcal por encima de tu meta, pero todavía mantendrías un déficit aproximado de ${Math.abs(deficitOrSurplus)} kcal.`
  }
  return "Hoy fue un día por encima de tu meta, pero tu progreso depende del promedio semanal, no de un solo día."
}

export function proteinMessage(day: DaySnapshot): string | null {
  if (day.proteinGoal <= 0) return null
  const pct = day.proteinConsumed / day.proteinGoal
  if (pct >= 1) return "Cumpliste tu proteína, un gran paso para proteger tu masa muscular."
  if (pct >= 0.8) return "Estás muy cerca de completar tu meta de proteína."
  return null
}

export function waterMessage(day: DaySnapshot): string | null {
  if (day.waterGoalMl <= 0) return null
  const pct = day.waterConsumedMl / day.waterGoalMl
  if (pct >= 1) return "Meta de hidratación completada."
  if (pct >= 0.5) return "Vas a mitad de tu meta de agua — un vaso más te acerca a completarla."
  return "Tu cuerpo también necesita agua para rendir."
}

export function workoutMessage(day: DaySnapshot): string {
  return day.hadWorkout
    ? "Completaste tu entrenamiento de hoy."
    : "Un día de descanso también puede ser parte del progreso."
}

export function streakMessage(day: DaySnapshot): string | null {
  if (day.loggingStreak < 2) return null
  return `Llevas una racha de ${day.loggingStreak} días registrando tus comidas.`
}

export function yesterdayGreeting(yesterday: DaySnapshot | null, name: string): { headline: string; lines: string[] } {
  const firstName = name.split(" ")[0]
  if (!yesterday) {
    return {
      headline: `Buenos días, ${firstName}`,
      lines: ["Hoy tienes una nueva oportunidad.", "Tu meta de hoy: constancia, no perfección."],
    }
  }

  const lines: string[] = [balanceMessage(yesterday)]
  const protein = proteinMessage(yesterday)
  if (protein) lines.push(protein)
  const water = waterMessage(yesterday)
  if (water) lines.push(water)
  lines.push(workoutMessage(yesterday))
  const streak = streakMessage(yesterday)
  if (streak) lines.push(streak)

  const wasPositive = yesterday.diffFromGoal <= 0 || yesterday.deficitOrSurplus < 0
  return {
    headline: `Buenos días, ${firstName}`,
    lines: [
      ...lines,
      wasPositive
        ? "Hoy tienes una nueva oportunidad de acercarte a tu objetivo."
        : "Ayer terminaste cerca de mantenimiento. Eso no borra tu progreso — hoy volvemos a enfocarnos en una decisión a la vez.",
    ],
  }
}

export function noRegistrationMessage(daysSinceLastLog: number): string | null {
  if (daysSinceLastLog < 3) return null
  return "Te extrañamos. Volver hoy ya cuenta como progreso."
}
