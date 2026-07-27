import { startOfDay, startOfMonth, endOfMonth, dateKey } from "./date"

export interface TrainingCalendarCell {
  day: number
  dateKey: string
  trained: boolean
  isFuture: boolean
  isToday: boolean
}

export interface TrainingCalendarMonth {
  monthLabel: string
  prevMonth: string
  nextMonth: string
  cells: (TrainingCalendarCell | null)[]
}

/**
 * Builds a 7-wide grid (with leading blanks for weekday alignment) marking
 * which days of the month had at least one strength or cardio session —
 * same shape as buildDeficitCalendarMonth so both calendars share a modal.
 */
export function buildTrainingCalendarMonth(monthAnchor: Date, trainedDates: Date[]): TrainingCalendarMonth {
  const monthStart = startOfMonth(monthAnchor)
  const monthEndDate = endOfMonth(monthAnchor)
  const trainedSet = new Set(trainedDates.map((d) => startOfDay(d).toDateString()))

  const today = startOfDay(new Date())
  const firstWeekday = monthStart.getDay()
  const daysInMonth = monthEndDate.getDate()

  const cells: (TrainingCalendarCell | null)[] = Array(firstWeekday).fill(null)
  for (let i = 0; i < daysInMonth; i++) {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1)
    cells.push({
      day: i + 1,
      dateKey: dateKey(d),
      trained: trainedSet.has(d.toDateString()),
      isFuture: d.getTime() > today.getTime(),
      isToday: d.getTime() === today.getTime(),
    })
  }

  const monthLabel = monthStart.toLocaleDateString("es", { month: "long", year: "numeric" })
  const prevMonth = dateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)).slice(0, 7)
  const nextMonth = dateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)).slice(0, 7)

  return { monthLabel, prevMonth, nextMonth, cells }
}
