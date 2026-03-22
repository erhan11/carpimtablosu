import type { FlowPickIntent } from '@/lib/flow/flowEngine'
import {
  type Question,
  factKey,
  parseTableId,
  pickQuestion,
  pickQuestionAvoiding,
  pickQuestionForcedWeak,
  pickSingleTableQuestion,
  randomInt,
} from '@/lib/math/questionBank'
import { TABLE_ORDER, toTableId, type TableId } from '@/types/progress'

export type QuestionVariant = 'standard' | 'reverse_missing_a' | 'reverse_missing_b' | 'twodigit'

export interface GameQuestion {
  base: Question
  variant: QuestionVariant
}

export function product(q: Question): number {
  return q.a * q.b
}

/** Pick a harder factor (11–19) × (1–10) with both tables unlocked. */
export function pickTwoDigitQuestion(): Question {
  return { a: randomInt(11, 19), b: randomInt(1, 10) }
}

export function pickMixedTableQuestion(unlockedTables: TableId[], weakKeys: string[]): Question {
  const tables = unlockedTables.map(parseTableId)
  if (tables.length >= 2 && Math.random() < 0.6) {
    const i = randomInt(0, tables.length - 1)
    let j = randomInt(0, tables.length - 1)
    let guard = 0
    while (j === i && tables.length > 1 && guard < 40) {
      j = randomInt(0, tables.length - 1)
      guard += 1
    }
    const x = tables[i]!
    const y = tables[j]!
    const a = Math.min(x, y)
    const b = Math.max(x, y)
    return { a, b }
  }
  if (weakKeys.length > 0 && Math.random() < 0.4) {
    const k = weakKeys[randomInt(0, weakKeys.length - 1)]!
    const parts = k.split('x').map(Number)
    if (parts.length === 2) {
      const [x, y] = parts.sort((m, n) => m - n) as [number, number]
      return { a: x, b: y }
    }
  }
  return pickQuestion(unlockedTables, weakKeys)
}

/** Weighted random variant for advanced / scaled difficulty. */
/**
 * Expert layer: 40% mixed tables, 30% reverse, 30% two-digit (MVP — no word problems).
 * `mixedOnly`: Mixed Challenge route — heavy bias toward cross-table questions.
 */
export function pickExpertGameQuestion(
  unlockedTables: TableId[],
  weakKeys: string[],
  opts: { difficultyScale: number; mixedOnly?: boolean; flowIntent?: FlowPickIntent },
): GameQuestion {
  const fi = opts.flowIntent
  const avoidRev = fi?.avoidReverse === true
  const avoid = new Set(fi?.avoidFactKeys ?? [])

  if (fi?.weakSlot && weakKeys.length > 0) {
    const base = pickQuestionForcedWeak(unlockedTables, weakKeys, avoid)
    return { base, variant: 'standard' }
  }
  if (fi?.singleTableOnly) {
    const base = pickSingleTableQuestion(
      unlockedTables,
      weakKeys,
      fi.preferPlanFocusTables ?? [],
      avoid,
    )
    return { base, variant: 'standard' }
  }

  if (opts.mixedOnly) {
    const r = Math.random()
    if (r < 0.7) {
      const base = pickMixedTableQuestion(unlockedTables, weakKeys)
      return { base, variant: 'standard' }
    }
    if (r < 0.9) {
      const base = pickMixedTableQuestion(unlockedTables, weakKeys)
      if (avoidRev) return { base, variant: 'standard' }
      return Math.random() < 0.5
        ? { base, variant: 'reverse_missing_a' }
        : { base, variant: 'reverse_missing_b' }
    }
    const base = pickTwoDigitQuestion()
    return { base, variant: base.a >= 11 ? 'twodigit' : 'standard' }
  }

  const r = Math.random()
  if (r < 0.4) {
    const base = pickMixedTableQuestion(unlockedTables, weakKeys)
    return { base, variant: 'standard' }
  }
  if (r < 0.7) {
    const base =
      Math.random() < 0.5
        ? pickMixedTableQuestion(unlockedTables, weakKeys)
        : pickQuestion(unlockedTables, weakKeys)
    if (avoidRev) return { base, variant: 'standard' }
    return Math.random() < 0.5
      ? { base, variant: 'reverse_missing_a' }
      : { base, variant: 'reverse_missing_b' }
  }
  const base = pickTwoDigitQuestion()
  return { base, variant: base.a >= 11 ? 'twodigit' : 'standard' }
}

/** Routes to expert distribution when `expertMode` is on; otherwise existing advanced logic. */
export function pickGameQuestionForSession(
  unlockedTables: TableId[],
  weakKeys: string[],
  opts: {
    advancedMode: boolean
    expertMode: boolean
    difficultyScale: number
    mixedOnly?: boolean
    flowIntent?: FlowPickIntent
  },
): GameQuestion {
  const fi = opts.flowIntent
  if (opts.mixedOnly) {
    if (opts.expertMode) {
      return pickExpertGameQuestion(unlockedTables, weakKeys, {
        difficultyScale: opts.difficultyScale,
        mixedOnly: true,
        flowIntent: fi,
      })
    }
    const avoid = new Set(fi?.avoidFactKeys ?? [])
    let base: Question
    if (fi?.weakSlot && weakKeys.length > 0) {
      base = pickQuestionForcedWeak(unlockedTables, weakKeys, avoid)
    } else {
      base = pickMixedTableQuestion(unlockedTables, weakKeys)
    }
    return { base, variant: 'standard' }
  }
  if (opts.expertMode) {
    return pickExpertGameQuestion(unlockedTables, weakKeys, {
      difficultyScale: opts.difficultyScale,
      mixedOnly: false,
      flowIntent: fi,
    })
  }
  return pickGameQuestion(unlockedTables, weakKeys, {
    advancedMode: opts.advancedMode,
    difficultyScale: opts.difficultyScale,
    flowIntent: fi,
  })
}

export function pickGameQuestion(
  unlockedTables: TableId[],
  weakKeys: string[],
  opts: { advancedMode: boolean; difficultyScale: number; flowIntent?: FlowPickIntent },
): GameQuestion {
  const fi = opts.flowIntent
  const avoid = new Set(fi?.avoidFactKeys ?? [])

  let base: Question
  if (fi?.weakSlot && weakKeys.length > 0) {
    base = pickQuestionForcedWeak(unlockedTables, weakKeys, avoid)
  } else if (fi?.singleTableOnly) {
    base = pickSingleTableQuestion(
      unlockedTables,
      weakKeys,
      fi.preferPlanFocusTables ?? [],
      avoid,
    )
  } else {
    const roll = Math.random() * Math.max(0.4, opts.difficultyScale)
    if (opts.advancedMode && fi?.twoDigitOk !== false && roll > 0.72) {
      base = pickQuestionAvoiding(() => pickTwoDigitQuestion(), avoid)
    } else if (opts.advancedMode && fi?.mixedTablesOk !== false && roll > 0.38) {
      base = pickQuestionAvoiding(() => pickMixedTableQuestion(unlockedTables, weakKeys), avoid)
    } else {
      base = pickQuestionAvoiding(() => pickQuestion(unlockedTables, weakKeys), avoid)
    }
  }

  if (!opts.advancedMode) {
    return { base, variant: 'standard' }
  }

  if (fi?.avoidReverse) {
    if (fi.variantHint === 'twodigit' && base.a >= 11) {
      return { base, variant: 'twodigit' }
    }
    return { base, variant: base.a >= 11 ? 'twodigit' : 'standard' }
  }

  if (fi?.variantHint === 'standard') {
    return { base, variant: base.a >= 11 ? 'twodigit' : 'standard' }
  }
  if (fi?.variantHint === 'reverse') {
    return Math.random() < 0.5
      ? { base, variant: 'reverse_missing_a' }
      : { base, variant: 'reverse_missing_b' }
  }
  if (fi?.variantHint === 'twodigit' && base.a >= 11) {
    return { base, variant: 'twodigit' }
  }
  if (fi?.variantHint === 'mixed') {
    return { base, variant: 'standard' }
  }

  const vr = Math.random()
  if (vr < 0.22) {
    return Math.random() < 0.5
      ? { base, variant: 'reverse_missing_a' }
      : { base, variant: 'reverse_missing_b' }
  }
  if (vr < 0.38 && base.a >= 11) {
    return { base, variant: 'twodigit' }
  }
  return { base, variant: 'standard' }
}

export function correctAnswerFor(game: GameQuestion): number {
  const p = product(game.base)
  if (game.variant === 'reverse_missing_a') return game.base.a
  if (game.variant === 'reverse_missing_b') return game.base.b
  return p
}

export function wrongAnswersForGame(game: GameQuestion, count: number): number[] {
  const correct = correctAnswerFor(game)
  const set = new Set<number>()
  set.add(correct)
  let guard = 0
  const max = game.variant === 'twodigit' || game.base.a > 10 || game.base.b > 10 ? 200 : 120
  const min = 1
  while (set.size < count + 1 && guard < 250) {
    guard += 1
    const v = randomInt(Math.max(min, correct - 25), Math.min(max, correct + 25))
    if (v !== correct) set.add(v)
  }
  while (set.size < count + 1) {
    const v = randomInt(1, max)
    if (v !== correct) set.add(v)
  }
  return [...set].filter((n) => n !== correct).slice(0, count)
}

export function formatQuestionPrompt(game: GameQuestion): string {
  const { base, variant } = game
  const p = product(base)
  if (variant === 'standard' || variant === 'twodigit') {
    return `${base.a} × ${base.b}`
  }
  if (variant === 'reverse_missing_a') {
    return `? × ${base.b} = ${p}`
  }
  return `${base.a} × ? = ${p}`
}

export function fastTrackTableIds(unlocked: TableId[]): TableId[] {
  const have = new Set(unlocked)
  const out = [...unlocked]
  for (const n of TABLE_ORDER.slice(0, 4)) {
    const id = toTableId(n)
    if (!have.has(id)) {
      out.push(id)
      have.add(id)
    }
  }
  return out
}

export function factKeyFromGame(game: GameQuestion): string {
  return factKey(game.base)
}
