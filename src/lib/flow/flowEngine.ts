/**
 * Adaptive flow: pure metrics, signals, difficulty adjustment, and pick intents.
 * No React / Zustand — inject rng for tests.
 */

import { getEffectiveProgramStart, getPlanWeekRow, focusPoolUnlocked } from '@/lib/plan/programWeek'
import { getLocalDay } from '@/lib/date/localDay'
import type { TableId } from '@/types/progress'

export const FLOW_METRICS_WINDOW = 18
export const BOREDOM_ACCURACY_MIN = 0.95
export const BOREDOM_FAST_MS = 1800
export const SHARP_RT_RATIO = 1.5
export const SHARP_RT_FLOOR_MS = 800
export const DIFFICULTY_MIN = 0.7
export const DIFFICULTY_MAX = 1.3
export const DIFFICULTY_STEP = 0.05
export const BREAK_AFTER_MS = 18 * 60 * 1000
export const MIN_SAMPLES_FOR_BOREDOM = 6

export type RecoveryKind = 'none' | 'switch_mode' | 'short_challenge'

export type VariantHint = 'standard' | 'reverse' | 'twodigit' | 'mixed' | 'auto'

export interface FlowMetrics {
  sampleCount: number
  accuracyRate: number
  avgResponseMs: number
  consecutiveCorrect: number
  consecutiveWrong: number
  /** Median ms of last 3 answers (within window), if available */
  medianLast3Ms: number | null
  /** Median ms of the 3 answers before those, if available */
  medianPrev3Ms: number | null
  sharpResponseTimeIncrease: boolean
}

export interface FlowPickIntent {
  weakSlot: boolean
  preferPlanFocusTables: number[]
  variantHint: VariantHint
  avoidReverse: boolean
  singleTableOnly: boolean
  mixedTablesOk: boolean
  twoDigitOk: boolean
  preferTimedRound: boolean
  avoidFactKeys: string[]
  recoveryKind: RecoveryKind
}

export type PerfBufferEntry = { correct: boolean; ms: number }

function median3(a: number, b: number, c: number): number {
  const s = [a, b, c].sort((x, y) => x - y)
  return s[1]!
}

export function updateFlowMetrics(
  buffer: readonly PerfBufferEntry[],
  opts?: { window?: number },
): FlowMetrics {
  const window = opts?.window ?? FLOW_METRICS_WINDOW
  const slice = buffer.length <= window ? buffer : buffer.slice(-window)
  const n = slice.length
  if (n === 0) {
    return {
      sampleCount: 0,
      accuracyRate: 0,
      avgResponseMs: 0,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      medianLast3Ms: null,
      medianPrev3Ms: null,
      sharpResponseTimeIncrease: false,
    }
  }

  let correct = 0
  let msSum = 0
  for (const e of slice) {
    if (e.correct) correct += 1
    msSum += e.ms
  }
  const accuracyRate = correct / n
  const avgResponseMs = msSum / n

  let consecutiveWrong = 0
  for (let i = n - 1; i >= 0; i -= 1) {
    if (!slice[i]!.correct) consecutiveWrong += 1
    else break
  }
  let consecutiveCorrect = 0
  for (let i = n - 1; i >= 0; i -= 1) {
    if (slice[i]!.correct) consecutiveCorrect += 1
    else break
  }

  let medianLast3Ms: number | null = null
  let medianPrev3Ms: number | null = null
  let sharpResponseTimeIncrease = false
  if (n >= 6) {
    const last3 = slice.slice(-3)
    const prev3 = slice.slice(-6, -3)
    medianLast3Ms = median3(last3[0]!.ms, last3[1]!.ms, last3[2]!.ms)
    medianPrev3Ms = median3(prev3[0]!.ms, prev3[1]!.ms, prev3[2]!.ms)
    if (
      medianPrev3Ms > 0 &&
      medianLast3Ms >= SHARP_RT_RATIO * medianPrev3Ms &&
      medianLast3Ms >= SHARP_RT_FLOOR_MS
    ) {
      sharpResponseTimeIncrease = true
    }
  }

  return {
    sampleCount: n,
    accuracyRate,
    avgResponseMs,
    consecutiveCorrect,
    consecutiveWrong,
    medianLast3Ms,
    medianPrev3Ms,
    sharpResponseTimeIncrease,
  }
}

export function detectFrustration(metrics: FlowMetrics): boolean {
  if (metrics.consecutiveWrong >= 3) return true
  if (metrics.sharpResponseTimeIncrease) return true
  return false
}

export function detectBoredom(metrics: FlowMetrics): boolean {
  if (metrics.sampleCount < MIN_SAMPLES_FOR_BOREDOM) return false
  if (metrics.accuracyRate <= BOREDOM_ACCURACY_MIN) return false
  if (metrics.avgResponseMs >= BOREDOM_FAST_MS) return false
  return true
}

/** 0–1: accuracy + speed + stability (simple blend). */
export function flowScore(metrics: FlowMetrics): number {
  if (metrics.sampleCount === 0) return 0.5
  const acc = metrics.accuracyRate
  const speedTerm = 1 - Math.min(1, metrics.avgResponseMs / 5000)
  const stability = 1 - Math.min(1, Math.abs(acc - 0.82) * 4)
  return 0.45 * acc + 0.35 * speedTerm + 0.2 * stability
}

export function adjustDifficulty(input: {
  currentScale: number
  frustration: boolean
  boredom: boolean
  flowScore: number
}): number {
  let delta = 0
  if (input.frustration) {
    delta = -DIFFICULTY_STEP
  } else if (input.boredom) {
    delta = DIFFICULTY_STEP
  } else {
    delta = 0
  }
  const next = input.currentScale + delta
  return Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, next))
}

export type SelectNextQuestionContext = {
  slotIndex: number
  difficultyScale: number
  advancedMode: boolean
  expertMode: boolean
  weakKeys: string[]
  preferPlanFocusTables: number[]
  recentStandardStreak: number
  avoidFactKeys: string[]
  metrics: FlowMetrics
  consecutiveFrustrationSignals: number
  mixedOnly?: boolean
}

export function selectNextQuestion(
  ctx: SelectNextQuestionContext,
  rng: () => number = Math.random,
): { intent: FlowPickIntent } {
  const frustration = detectFrustration(ctx.metrics)
  const boredom = detectBoredom(ctx.metrics)
  const fs = flowScore(ctx.metrics)

  let recoveryKind: RecoveryKind = 'none'
  if (ctx.consecutiveFrustrationSignals >= 2) {
    recoveryKind = 'switch_mode'
  } else if (fs < 0.28) {
    recoveryKind = 'short_challenge'
  }

  const weakSlot = ctx.slotIndex % 10 < 3

  let singleTableOnly = false
  let mixedTablesOk = ctx.mixedOnly !== true
  let twoDigitOk = ctx.advancedMode && ctx.difficultyScale >= 0.95
  let avoidReverse = false
  let variantHint: VariantHint = 'auto'
  let preferTimedRound = false

  if (frustration) {
    singleTableOnly = true
    mixedTablesOk = false
    twoDigitOk = false
    avoidReverse = true
    variantHint = 'standard'
  } else if (boredom) {
    singleTableOnly = false
    mixedTablesOk = true
    twoDigitOk = ctx.advancedMode
    avoidReverse = false
    const r = rng()
    if (r < 0.34) variantHint = 'mixed'
    else if (r < 0.67) variantHint = 'reverse'
    else variantHint = 'twodigit'
  }

  if (!frustration && ctx.recentStandardStreak >= 5) {
    const r = rng()
    if (r < 0.34) {
      variantHint = 'reverse'
    } else if (r < 0.67) {
      variantHint = 'mixed'
    } else {
      variantHint = 'standard'
      preferTimedRound = true
    }
    mixedTablesOk = true
    singleTableOnly = false
    if (ctx.advancedMode) twoDigitOk = true
  }

  if (ctx.mixedOnly) {
    mixedTablesOk = true
    singleTableOnly = false
    if (variantHint === 'auto') variantHint = 'mixed'
  }

  const intent: FlowPickIntent = {
    weakSlot,
    preferPlanFocusTables: ctx.preferPlanFocusTables,
    variantHint,
    avoidReverse,
    singleTableOnly,
    mixedTablesOk,
    twoDigitOk,
    preferTimedRound,
    avoidFactKeys: [...ctx.avoidFactKeys],
    recoveryKind,
  }

  return { intent }
}

export function suggestBreak(sessionDurationMs: number): { shouldSuggest: boolean } {
  return { shouldSuggest: sessionDurationMs >= BREAK_AFTER_MS }
}

/** Plan focus tables for today (unlocked only). */
export function getPreferPlanFocusTables(
  programStartDate: string | undefined,
  unlockedTableIds: TableId[],
): number[] {
  const start = getEffectiveProgramStart(programStartDate)
  const row = getPlanWeekRow(start, getLocalDay())
  return focusPoolUnlocked(row, unlockedTableIds)
}

export function buildFlowPickForNextQuestion(
  args: {
    slotIndex: number
    performanceBuffer: readonly PerfBufferEntry[]
    programStartDate: string | undefined
    unlockedTableIds: TableId[]
    weakKeys: string[]
    difficultyScale: number
    advancedMode: boolean
    expertMode: boolean
    mixedOnly?: boolean
    recentStandardStreak: number
    avoidFactKeys: string[]
    consecutiveFrustrationSignals: number
  },
  rng: () => number = Math.random,
): { intent: FlowPickIntent; metrics: FlowMetrics } {
  const metrics = updateFlowMetrics(args.performanceBuffer)
  const preferPlanFocusTables = getPreferPlanFocusTables(
    args.programStartDate,
    args.unlockedTableIds,
  )
  const { intent } = selectNextQuestion(
    {
      slotIndex: args.slotIndex,
      difficultyScale: args.difficultyScale,
      advancedMode: args.advancedMode,
      expertMode: args.expertMode,
      weakKeys: args.weakKeys,
      preferPlanFocusTables,
      recentStandardStreak: args.recentStandardStreak,
      avoidFactKeys: args.avoidFactKeys,
      metrics,
      consecutiveFrustrationSignals: args.consecutiveFrustrationSignals,
      mixedOnly: args.mixedOnly,
    },
    rng,
  )
  return { intent, metrics }
}
