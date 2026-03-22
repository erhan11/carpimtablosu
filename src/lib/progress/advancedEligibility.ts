import { getLocalDay } from '@/lib/date/localDay'

const ACC_ADVANCED = 0.9
const STREAK_MIN = 5
const FAST_AVG_MS = 3800
const BUF_MIN = 14

const ACC_SKIP = 0.95
const SKIP_BUF_MIN = 16
const SKIP_FAST_MS = 4200

type OfferSlice = {
  advancedMode: boolean
  advancedOfferDismissedDay?: string
  streak: { current: number; lastActiveDate: string }
  performanceBuffer: { correct: boolean; ms: number }[]
}

export function shouldOfferAdvancedMode(s: OfferSlice): boolean {
  if (s.advancedMode) return false
  if (s.advancedOfferDismissedDay === getLocalDay()) return false
  if (s.streak.current < STREAK_MIN) return false
  const buf = s.performanceBuffer ?? []
  if (buf.length < BUF_MIN) return false
  const acc = buf.filter((x) => x.correct).length / buf.length
  if (acc < ACC_ADVANCED) return false
  const avgMs = buf.reduce((a, b) => a + b.ms, 0) / buf.length
  return avgMs < FAST_AVG_MS
}

export function shouldOfferLevelSkip(s: {
  levelSkipOfferDismissedDay?: string
  performanceBuffer: { correct: boolean; ms: number }[]
}): boolean {
  if (s.levelSkipOfferDismissedDay === getLocalDay()) return false
  const buf = s.performanceBuffer ?? []
  if (buf.length < SKIP_BUF_MIN) return false
  const acc = buf.filter((x) => x.correct).length / buf.length
  if (acc < ACC_SKIP) return false
  const avgMs = buf.reduce((a, b) => a + b.ms, 0) / buf.length
  return avgMs < SKIP_FAST_MS
}
