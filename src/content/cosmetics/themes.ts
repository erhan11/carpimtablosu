export interface ThemeDef {
  id: string
  color: string
  /** Purple is gated until level 7 (see Profile + level rewards). */
  requiresLevel?: number
}

export const THEMES: ThemeDef[] = [
  { id: 'blue', color: '#3B82F6' },
  { id: 'green', color: '#10B981' },
  { id: 'purple', color: '#8B5CF6', requiresLevel: 7 },
]

export const DEFAULT_THEME_ID = 'blue'
