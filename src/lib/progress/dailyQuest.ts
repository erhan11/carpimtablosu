import { getLocalDay } from '@/lib/date/localDay'
import {
  focusPoolUnlocked,
  getPlanWeekRow,
} from '@/lib/plan/programWeek'
import { parseTableId } from '@/lib/math/questionBank'
import type { DailyQuestState, DayPracticeEntry, TableId, WeakFact } from '@/types/progress'

function randomPick(items: number[]): number {
  return items[Math.floor(Math.random() * items.length)]!
}

export function yesterdayFrom(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  return getLocalDay(dt)
}

/** Weekly focus first; weak-aware within that pool; then full unlocked pool. */
function pickTableForPlanHybrid(
  unlockedTableIds: TableId[],
  weakFacts: WeakFact[],
  programStartDate: string,
): number {
  const today = getLocalDay()
  const row = getPlanWeekRow(programStartDate, today)
  const pool = focusPoolUnlocked(row, unlockedTableIds)
  const tables = unlockedTableIds.map(parseTableId).filter((n) => n > 0)
  if (tables.length === 0) return 1
  const targetPool = pool.length > 0 ? pool : tables
  if (weakFacts.length > 0 && Math.random() < 0.5) {
    const parts = weakFacts[0]!.key.split('x').map(Number)
    const a = parts[0]
    const b = parts[1]
    for (const n of [a, b]) {
      if (n !== undefined && n >= 1 && n <= 10 && targetPool.includes(n)) return n
    }
  }
  return randomPick(targetPool)
}

export function generateDailyQuest(
  unlockedTableIds: TableId[],
  practiceByDay: DayPracticeEntry[],
  weakFacts: WeakFact[],
  programStartDate: string,
): DailyQuestState {
  const today = getLocalDay()
  const y = yesterdayFrom(today)
  const ydata = practiceByDay.find((d) => d.date === y)
  const hasYesterday =
    ydata !== undefined && (ydata.factKeys.length > 0 || ydata.tables.length > 0)

  if (hasYesterday && ydata) {
    const reviewFacts = [...new Set(ydata.factKeys)].slice(0, 24)
    const reviewTables = [...new Set(ydata.tables)].slice(0, 10)
    return {
      date: today,
      taskId: 'reviewYesterday',
      target: 6,
      progress: 0,
      completed: false,
      reviewFacts,
      reviewTables,
    }
  }

  const table = pickTableForPlanHybrid(unlockedTableIds, weakFacts, programStartDate)
  return {
    date: today,
    taskId: 'solveWithCorrect',
    target: 6,
    progress: 0,
    completed: false,
    table,
  }
}

export function countsTowardDaily(
  question: { a: number; b: number },
  daily: DailyQuestState,
  factKeyStr: string,
): boolean {
  const taskId = daily.taskId ?? 'solveWithCorrect'
  if (taskId === 'reviewYesterday') {
    if (daily.reviewFacts?.includes(factKeyStr)) return true
    if (daily.reviewTables?.length) {
      return daily.reviewTables.includes(question.a) || daily.reviewTables.includes(question.b)
    }
    return false
  }
  if (taskId === 'solveWithCorrect' && daily.table !== undefined) {
    return question.a === daily.table || question.b === daily.table
  }
  return false
}
