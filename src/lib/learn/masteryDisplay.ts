/**
 * Read-only helpers for displaying table mastery (0–3). Does not change store rules.
 */

export function getMasteryLevel(
  tableMastery: Record<string, number> | undefined,
  n: number,
): number {
  if (!Number.isInteger(n) || n < 1 || n > 10) return 0
  const raw = tableMastery?.[String(n)]
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0
  return Math.min(3, Math.max(0, Math.floor(raw)))
}

/** Picker: compact filled stars only (0 = empty string). */
export function masteryStarsCompact(level: number): string {
  const lv = Math.min(3, Math.max(0, level))
  return '★'.repeat(lv)
}

/** Active session: filled + empty for 3 slots (e.g. ★★☆). */
export function masteryStarsPadded(level: number): string {
  const lv = Math.min(3, Math.max(0, level))
  return '★'.repeat(lv) + '☆'.repeat(3 - lv)
}
