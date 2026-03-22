export interface AvatarDef {
  id: string
  emoji: string
  cost: number
}

export const AVATARS: AvatarDef[] = [
  { id: 'cat', emoji: '🐱', cost: 0 },
  { id: 'robot', emoji: '🤖', cost: 50 },
  { id: 'fox', emoji: '🦊', cost: 50 },
]

export const DEFAULT_AVATAR_ID = 'cat'
