import { startOfDay, startOfMonth, endOfMonth, dateKey } from "./date"

export interface DeficitCalendarCell {
  day: number
  dateKey: string
  hasData: boolean
  met: boolean
  isFuture: boolean
  isToday: boolean
}

export interface DeficitCalendarMonth {
  monthLabel: string
  prevMonth: string
  nextMonth: string
  cells: (DeficitCalendarCell | null)[]
}

/**
 * Builds a 7-wide grid (with leading blanks for weekday alignment) marking
 * which days of the month hit a calorie deficit, from each day's
 * `goalsCompletedJson.deficit` flag — the same flag /calendar and /history
 * already use, so all three views agree on what "met" means.
 */
export function buildDeficitCalendarMonth(
  monthAnchor: Date,
  summaries: { date: Date; goalsCompletedJson: string }[]
): DeficitCalendarMonth {
  const monthStart = startOfMonth(monthAnchor)
  const monthEndDate = endOfMonth(monthAnchor)
  const byDate = new Map(
    summaries.map((s) => [startOfDay(s.date).toDateString(), JSON.parse(s.goalsCompletedJson || "{}").deficit === true])
  )

  const today = startOfDay(new Date())
  const firstWeekday = monthStart.getDay()
  const daysInMonth = monthEndDate.getDate()

  const cells: (DeficitCalendarCell | null)[] = Array(firstWeekday).fill(null)
  for (let i = 0; i < daysInMonth; i++) {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1)
    const key = d.toDateString()
    cells.push({
      day: i + 1,
      dateKey: dateKey(d),
      hasData: byDate.has(key),
      met: byDate.get(key) ?? false,
      isFuture: d.getTime() > today.getTime(),
      isToday: d.getTime() === today.getTime(),
    })
  }

  const monthLabel = monthStart.toLocaleDateString("es", { month: "long", year: "numeric" })
  const prevMonth = dateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)).slice(0, 7)
  const nextMonth = dateKey(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)).slice(0, 7)

  return { monthLabel, prevMonth, nextMonth, cells }
}
