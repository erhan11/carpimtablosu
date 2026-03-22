import { TABLE_ORDER, type TableId, toTableId } from '@/types/progress'

export interface Question {
  a: number
  b: number
}

export function factKey(q: Question): string {
  const [x, y] = [q.a, q.b].sort((m, n) => m - n)
  return `${x}x${y}`
}

export function parseTableId(id: TableId): number {
  return Number(id.replace(/^x/, ''))
}

export function allFactsForTable(table: number): Question[] {
  const out: Question[] = []
  for (let b = 1; b <= 10; b += 1) {
    out.push({ a: table, b })
  }
  return out
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function pickQuestion(
  unlockedTables: TableId[],
  preferWeak: string[] = [],
): Question {
  const tables = unlockedTables.map(parseTableId)
  if (tables.length === 0) {
    return { a: 1, b: randomInt(1, 10) }
  }
  if (preferWeak.length > 0 && Math.random() < 0.45) {
    const k = preferWeak[randomInt(0, preferWeak.length - 1)]!
    const parts = k.split('x').map(Number)
    if (parts.length === 2) {
      const [x, y] = parts
      if (x !== undefined && y !== undefined) {
        return { a: x, b: y }
      }
    }
  }
  const t = tables[randomInt(0, tables.length - 1)]!
  const b = randomInt(1, 10)
  return { a: t, b }
}

export function pickQuestionForTable(table: number): Question {
  return { a: table, b: randomInt(1, 10) }
}

export function wrongAnswers(correct: number, count: number, max = 100): number[] {
  const set = new Set<number>()
  set.add(correct)
  let guard = 0
  while (set.size < count + 1 && guard < 200) {
    guard += 1
    const v = randomInt(Math.max(0, correct - 15), Math.min(max, correct + 15))
    if (v !== correct) set.add(v)
  }
  while (set.size < count + 1) {
    const v = randomInt(1, max)
    if (v !== correct) set.add(v)
  }
  return [...set].filter((n) => n !== correct).slice(0, count)
}

export function nextTableToUnlock(unlocked: TableId[]): TableId | null {
  const have = new Set(unlocked)
  for (const n of TABLE_ORDER) {
    const id = toTableId(n)
    if (!have.has(id)) return id
  }
  return null
}

export function isTableUnlocked(unlocked: TableId[], table: number): boolean {
  return unlocked.includes(toTableId(table))
}

export function defaultUnlockedTables(): TableId[] {
  return [toTableId(1)]
}
