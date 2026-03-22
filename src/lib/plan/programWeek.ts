import { THREE_MONTH_PLAN } from '@/content/plan'
import { getLocalDay } from '@/lib/date/localDay'
import { parseTableId } from '@/lib/math/questionBank'
import type { TableId } from '@/types/progress'

export type PlanWeekRow = {
  week: number
  tables: readonly number[]
  review: readonly number[]
}

/** Flattened 12-week curriculum (week numbers 1–12). */
export const PLAN_WEEKS: PlanWeekRow[] = THREE_MONTH_PLAN.months.flatMap((m) => [...m.weeks])

export function daysBetweenLocal(start: string, end: string): number {
  const [y1, m1, d1] = start.split('-').map(Number)
  const [y2, m2, d2] = end.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1).getTime()
  const b = new Date(y2, m2 - 1, d2).getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

/** 0-based index into PLAN_WEEKS; clamps to last week after plan ends. */
export function getPlanWeekIndex(programStartDate: string, today: string): number {
  const days = daysBetweenLocal(programStartDate, today)
  if (days < 0) return 0
  const idx = Math.floor(days / 7)
  return Math.min(idx, PLAN_WEEKS.length - 1)
}

export function getPlanWeekRow(programStartDate: string, today: string): PlanWeekRow {
  return PLAN_WEEKS[getPlanWeekIndex(programStartDate, today)]!
}

export function weekFocusNumbers(row: PlanWeekRow): number[] {
  return [...new Set([...row.tables, ...row.review])]
}

export function focusPoolUnlocked(row: PlanWeekRow, unlockedTableIds: TableId[]): number[] {
  const unlocked = new Set(
    unlockedTableIds.map(parseTableId).filter((n) => n >= 1 && n <= 10),
  )
  return weekFocusNumbers(row).filter((n) => unlocked.has(n))
}

/** Single effective start date for plan math and persistence (avoids undefined vs today mismatch). */
export function getEffectiveProgramStart(programStartDate: string | undefined): string {
  return programStartDate ?? getLocalDay()
}

