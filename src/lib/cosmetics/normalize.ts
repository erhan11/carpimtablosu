import { AVATARS, DEFAULT_AVATAR_ID } from '@/content/cosmetics/avatars'
import { DEFAULT_THEME_ID, THEMES } from '@/content/cosmetics/themes'
import type { CosmeticsState } from '@/types/progress'

type LegacyCosmetics = Partial<CosmeticsState> & {
  unlockedStickers?: string[]
}

export function normalizeCosmetics(raw: LegacyCosmetics | undefined): CosmeticsState {
  const stickersUnlocked = raw?.stickersUnlocked ?? raw?.unlockedStickers ?? []
  let themeId = raw?.themeId ?? DEFAULT_THEME_ID
  if (themeId === 'sunny') themeId = DEFAULT_THEME_ID
  if (!THEMES.some((t) => t.id === themeId)) themeId = DEFAULT_THEME_ID

  let avatarId = raw?.avatarId ?? DEFAULT_AVATAR_ID
  if (!AVATARS.some((a) => a.id === avatarId)) avatarId = DEFAULT_AVATAR_ID

  const unlockedAvatarIds =
    raw?.unlockedAvatarIds && raw.unlockedAvatarIds.length > 0
      ? [...new Set(raw.unlockedAvatarIds)]
      : avatarId === 'fox'
        ? ['cat', 'fox']
        : ['cat']

  return {
    avatarId,
    themeId,
    stickersUnlocked,
    unlockedAvatarIds,
  }
}
