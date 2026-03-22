import type { CosmeticsState } from '@/types/progress'

export type LevelRewardResult = {
  cosmetics: CosmeticsState
  /** Any new unlock from this level-up (sticker, avatar, or theme band). */
  unlockedSomething: boolean
}

function uniqPush(arr: string[], id: string): boolean {
  if (arr.includes(id)) return false
  arr.push(id)
  return true
}

/** Call when `newLevel > prevLevel`. Idempotent for duplicate levels. */
export function handleLevelRewards(
  prevLevel: number,
  newLevel: number,
  cosmetics: CosmeticsState,
): LevelRewardResult {
  if (newLevel <= prevLevel) {
    return { cosmetics, unlockedSomething: false }
  }

  let unlockedSomething = false
  const stickersUnlocked = [...(cosmetics.stickersUnlocked ?? [])]
  const unlockedAvatarIds = [...(cosmetics.unlockedAvatarIds ?? ['cat'])]

  if (newLevel >= 3 && uniqPush(stickersUnlocked, 'star')) unlockedSomething = true
  if (newLevel >= 5 && uniqPush(unlockedAvatarIds, 'robot')) unlockedSomething = true
  if (newLevel >= 7 && prevLevel < 7) unlockedSomething = true

  return {
    cosmetics: {
      ...cosmetics,
      stickersUnlocked,
      unlockedAvatarIds,
    },
    unlockedSomething,
  }
}
