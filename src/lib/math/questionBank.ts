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

/** Parse "3x4", "4x3", or "3-4" into a canonical multiplication question (sorted factors). */
export function parseFactKeyString(raw: string): Question | null {
  const s = raw.trim().toLowerCase().replace(/×/g, 'x')
  const parts = s.split(/x|-/).map((p) => Number(p.trim()))
  if (parts.length !== 2 || parts.some((n) => !Number.isInteger(n) || n < 1 || n > 10)) {
    return null
  }
  const [x, y] = parts.sort((a, b) => a - b) as [number, number]
  return { a: x, b: y }
}

export function normalizeFactKeyFromInput(raw: string | null | undefined): string | null {
  if (!raw) return null
  const q = parseFactKeyString(raw)
  if (!q) return null
  return factKey(q)
}

export function factInvolvesUnlockedTables(q: Question, unlockedTableIds: TableId[]): boolean {
  return isTableUnlocked(unlockedTableIds, q.a) && isTableUnlocked(unlockedTableIds, q.b)
}

/** Retry pick until fact key is not in avoid set (bounded attempts). */
export function pickQuestionAvoiding(pick: () => Question, avoidKeys: Set<string>, maxAttempts = 8): Question {
  for (let i = 0; i < maxAttempts; i += 1) {
    const q = pick()
    if (!avoidKeys.has(factKey(q))) return q
  }
  return pick()
}

/** Prefer a weak fact for reinforcement (flow engine weak slot). */
export function pickQuestionForcedWeak(
  unlockedTables: TableId[],
  weakKeys: string[],
  avoidKeys: Set<string>,
): Question {
  const candidates = weakKeys.filter((k) => {
    const q = parseFactKeyString(k)
    if (!q || !factInvolvesUnlockedTables(q, unlockedTables)) return false
    return !avoidKeys.has(factKey(q))
  })
  if (candidates.length === 0) {
    return pickQuestionAvoiding(() => pickQuestion(unlockedTables, weakKeys), avoidKeys)
  }
  const k = candidates[randomInt(0, candidates.length - 1)]!
  const q = parseFactKeyString(k)
  return q ?? pickQuestion(unlockedTables, weakKeys)
}

/** Single-table practice (frustration / recovery). */
export function pickSingleTableQuestion(
  unlockedTables: TableId[],
  weakKeys: string[],
  preferPlanFocusTables: number[],
  avoidKeys: Set<string>,
): Question {
  const tables = unlockedTables.map(parseTableId).filter((n) => n >= 1 && n <= 10)
  if (tables.length === 0) {
    return { a: 1, b: randomInt(1, 10) }
  }
  const weakTables = new Set<number>()
  for (const k of weakKeys) {
    const q = parseFactKeyString(k)
    if (q && factInvolvesUnlockedTables(q, unlockedTables)) {
      weakTables.add(q.a)
      weakTables.add(q.b)
    }
  }
  const weakArr = [...weakTables].filter((t) => tables.includes(t))
  const focusArr = preferPlanFocusTables.filter((t) => tables.includes(t))
  const r = Math.random()
  let table: number
  if (weakArr.length > 0 && r < 0.45) {
    table = weakArr[randomInt(0, weakArr.length - 1)]!
  } else if (focusArr.length > 0 && r < 0.75) {
    table = focusArr[randomInt(0, focusArr.length - 1)]!
  } else {
    table = tables[randomInt(0, tables.length - 1)]!
  }
  return pickQuestionAvoiding(() => pickQuestionForTable(table), avoidKeys)
}

/**
 * Bias early slots toward a target fact (or table-only focus); then mix with weak + generic.
 * @param totalSlots — expected questions per "session slice" (e.g. 4 for match deck, 12 for balloon run)
 */
export function pickQuestionAdaptive(
  unlockedTableIds: TableId[],
  weakKeys: string[],
  targetFactKey: string | undefined,
  slotIndex: number,
  totalSlots: number,
  tableFocus?: number,
): Question {
  const biasWindow = Math.min(3, totalSlots)
  const inBias = slotIndex < biasWindow

  if (targetFactKey && inBias && Math.random() < 0.68) {
    const q = parseFactKeyString(targetFactKey)
    if (q && factInvolvesUnlockedTables(q, unlockedTableIds)) {
      return q
    }
  }

  if (tableFocus !== undefined && inBias && Math.random() < 0.65) {
    return pickQuestionForTable(tableFocus)
  }

  const pref = targetFactKey
    ? [targetFactKey, ...weakKeys.filter((k) => k !== targetFactKey)]
    : weakKeys
  return pickQuestion(unlockedTableIds, pref)
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
