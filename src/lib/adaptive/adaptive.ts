import type { TableId } from '@/types/progress'
import {
  factInvolvesUnlockedTables,
  parseFactKeyString,
} from '@/lib/math/questionBank'

export const ADAPTIVE_SUPPORTED_MODES = ['balloon', 'match', 'memory'] as const
export type AdaptiveGameMode = (typeof ADAPTIVE_SUPPORTED_MODES)[number]

export function isAdaptiveGameMode(m: string): m is AdaptiveGameMode {
  return (ADAPTIVE_SUPPORTED_MODES as readonly string[]).includes(m)
}

export function nextAdaptiveMode(
  recentByFact: Record<string, string>,
  factKey: string,
): AdaptiveGameMode {
  const last = recentByFact[factKey]
  const idx =
    last && isAdaptiveGameMode(last) ? ADAPTIVE_SUPPORTED_MODES.indexOf(last) : -1
  return ADAPTIVE_SUPPORTED_MODES[(idx + 1) % ADAPTIVE_SUPPORTED_MODES.length]
}

export function pickWeakFactForAdaptive(
  weakFacts: { key: string; mistakes: number }[],
  unlockedTableIds: TableId[],
): string | null {
  for (const w of weakFacts) {
    const q = parseFactKeyString(w.key)
    if (q && factInvolvesUnlockedTables(q, unlockedTableIds)) {
      return w.key
    }
  }
  return null
}

export function buildAdaptiveGamePath(mode: AdaptiveGameMode, factKey: string): string {
  const enc = encodeURIComponent(factKey)
  return `/games/${mode}?fact=${enc}`
}

export function formatFactDisplay(factKey: string, locale: string): string {
  const q = parseFactKeyString(factKey)
  if (!q) return factKey
  const nf = new Intl.NumberFormat(locale)
  return `${nf.format(q.a)} × ${nf.format(q.b)}`
}

export function parseTableQuery(raw: string | null): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 10) return undefined
  return n
}

