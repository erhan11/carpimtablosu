export type LocaleCode = 'tr' | 'en'

export type TableId = `x${number}`

export interface WeakFact {
  key: string
  mistakes: number
}

/** Rolling calendar-day log for “what was practiced” (facts + table factors). */
export interface DayPracticeEntry {
  date: string
  factKeys: string[]
  tables: number[]
}

export interface AdaptiveState {
  /** Last recommended game id per fact key (e.g. "3x4") for rotation. */
  recentRecommendedGameByFact: Record<string, string>
  lastAdaptiveGameAt?: string
}

export interface CosmeticsState {
  avatarId: string
  themeId: string
  stickersUnlocked: string[]
  /** Avatars the child may select (free defaults + purchases + level unlocks). */
  unlockedAvatarIds: string[]
}

export type DailyTaskId = 'solveWithCorrect' | 'reviewYesterday'

export interface DailyQuestState {
  date: string
  /** Older saves may omit; treat as solveWithCorrect */
  taskId?: DailyTaskId
  target: number
  progress: number
  completed: boolean
  /** Table focus for solveWithCorrect (1–10) */
  table?: number
  /** Snapshot from yesterday for reviewYesterday */
  reviewFacts?: string[]
  reviewTables?: number[]
}

export interface DayStat {
  date: string
  minutes: number
  correct: number
  wrong: number
}

export interface ProgressSnapshot {
  version: number
  locale: LocaleCode
  hasCompletedLanguageSelect: boolean
  /** When the guided 3-month program started (local YYYY-MM-DD). */
  programStartDate?: string
  coins: number
  stars: number
  level: number
  xp: number
  streak: { current: number; lastActiveDate: string }
  unlockedTableIds: TableId[]
  masteredFacts: string[]
  weakFacts: WeakFact[]
  daily: DailyQuestState
  gamesStats: Record<string, { played: number; correct: number }>
  last7Days: DayStat[]
  cosmetics: CosmeticsState
  earnedBadges: string[]
  sessionStartMs: number
}

export const PROGRESS_VERSION = 1 as const

export const TABLE_ORDER = [1, 2, 5, 10, 3, 4, 6, 7, 8, 9] as const

export function toTableId(n: number): TableId {
  return `x${n}` as TableId
}
