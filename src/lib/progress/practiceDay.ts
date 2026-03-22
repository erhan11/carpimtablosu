import { factKey, type Question } from '@/lib/math/questionBank'
import type { DayPracticeEntry } from '@/types/progress'

const MAX_DAYS = 14

function uniqNums(n: number[]): number[] {
  return [...new Set(n)].filter((x) => x >= 1 && x <= 10).sort((a, b) => a - b)
}

export function upsertPracticeDay(
  practiceByDay: DayPracticeEntry[],
  date: string,
  question: Question,
): DayPracticeEntry[] {
  const fk = factKey(question)
  const tables = uniqNums([question.a, question.b])
  const next = [...practiceByDay]
  const idx = next.findIndex((d) => d.date === date)
  if (idx === -1) {
    next.push({ date, factKeys: [fk], tables })
  } else {
    const cur = next[idx]!
    const factKeys = cur.factKeys.includes(fk) ? cur.factKeys : [...cur.factKeys, fk]
    const mergedTables = uniqNums([...cur.tables, ...tables])
    next[idx] = { date, factKeys, tables: mergedTables }
  }
  next.sort((a, b) => a.date.localeCompare(b.date))
  while (next.length > MAX_DAYS) next.shift()
  return next
}
