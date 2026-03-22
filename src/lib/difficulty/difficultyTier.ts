/** Maps store flags to a small set of tier keys for UI badges (i18n under common.difficulty.*). */
export type DifficultyTierKey = 'easy' | 'normal' | 'hard' | 'expert'

export function getDifficultyTierKey(input: {
  advancedMode: boolean
  expertMode: boolean
  difficultyScale: number
}): DifficultyTierKey {
  if (input.expertMode) return 'expert'
  if (!input.advancedMode) return 'easy'
  const s = input.difficultyScale ?? 1
  if (s >= 1.12) return 'hard'
  return 'normal'
}
