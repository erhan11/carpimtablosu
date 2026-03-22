import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { persist } from 'zustand/middleware'
import { getLocalDay } from '@/lib/date/localDay'
import { factKey, type Question } from '@/lib/math/questionBank'
import {
  countsTowardDaily,
  generateDailyQuest,
  yesterdayFrom,
} from '@/lib/progress/dailyQuest'
import { upsertPracticeDay } from '@/lib/progress/practiceDay'
import { defaultUnlockedTables, nextTableToUnlock } from '@/lib/math/questionBank'
import { AVATARS } from '@/content/cosmetics/avatars'
import { THEMES } from '@/content/cosmetics/themes'
import { handleLevelRewards } from '@/lib/cosmetics/levelRewards'
import { normalizeCosmetics } from '@/lib/cosmetics/normalize'
import {
  adjustDifficulty,
  detectBoredom,
  detectFrustration,
  flowScore,
  updateFlowMetrics,
} from '@/lib/flow/flowEngine'
import { fastTrackTableIds } from '@/lib/math/advancedQuestions'
import {
  PROGRESS_VERSION,
  toTableId,
  type AdaptiveState,
  type CosmeticsState,
  type DayPracticeEntry,
  type LocaleCode,
  type TableId,
} from '@/types/progress'

const STORAGE_KEY = 'carpim-progress-v1'

function sanitizePersistedStreak(
  raw: unknown,
  fallback: { current: number; lastActiveDate: string },
): { current: number; lastActiveDate: string } {
  if (!raw || typeof raw !== 'object') return fallback
  const r = raw as { current?: unknown; lastActiveDate?: unknown }
  const current =
    typeof r.current === 'number' && Number.isFinite(r.current)
      ? Math.max(0, Math.floor(r.current))
      : fallback.current
  const lastActiveDate =
    typeof r.lastActiveDate === 'string' ? r.lastActiveDate : fallback.lastActiveDate
  return { current, lastActiveDate }
}

function bumpDayStats(
  days: { date: string; minutes: number; correct: number; wrong: number }[],
  today: string,
  delta: { minutes?: number; correct?: number; wrong?: number },
) {
  const next = [...days]
  let idx = next.findIndex((d) => d.date === today)
  if (idx === -1) {
    next.push({ date: today, minutes: 0, correct: 0, wrong: 0 })
    idx = next.length - 1
  }
  const row = next[idx]!
  next[idx] = {
    date: row.date,
    minutes: row.minutes + (delta.minutes ?? 0),
    correct: row.correct + (delta.correct ?? 0),
    wrong: row.wrong + (delta.wrong ?? 0),
  }
  next.sort((a, b) => a.date.localeCompare(b.date))
  while (next.length > 14) next.shift()
  return next
}

/** Exported for UI that derives the 7-day rollups from `last7DaysRaw` without unstable Zustand selectors. */
export function rollLast7Days(
  days: { date: string; minutes: number; correct: number; wrong: number }[],
): { date: string; minutes: number; correct: number; wrong: number }[] {
  const out: { date: string; minutes: number; correct: number; wrong: number }[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const dt = new Date()
    dt.setHours(0, 0, 0, 0)
    dt.setDate(dt.getDate() - i)
    const key = getLocalDay(dt)
    const found = days.find((d) => d.date === key)
    out.push(
      found ?? {
        date: key,
        minutes: 0,
        correct: 0,
        wrong: 0,
      },
    )
  }
  return out
}

function touchStreak(last: { current: number; lastActiveDate: string }): {
  current: number
  lastActiveDate: string
} {
  const today = getLocalDay()
  if (last.lastActiveDate === today) return last
  const y = yesterdayFrom(today)
  let current = 1
  if (last.lastActiveDate === y) {
    current = last.current + 1
  }
  return { current, lastActiveDate: today }
}

function upsertWeak(weak: { key: string; mistakes: number }[], key: string) {
  const w = [...weak]
  const i = w.findIndex((x) => x.key === key)
  if (i === -1) w.push({ key, mistakes: 1 })
  else {
    const cur = w[i]!
    w[i] = { key, mistakes: cur.mistakes + 1 }
  }
  return w.sort((a, b) => b.mistakes - a.mistakes).slice(0, 24)
}

export interface ProgressState {
  version: number
  locale: LocaleCode
  hasCompletedLanguageSelect: boolean
  coins: number
  stars: number
  level: number
  xp: number
  streak: { current: number; lastActiveDate: string }
  unlockedTableIds: TableId[]
  masteredFacts: string[]
  weakFacts: { key: string; mistakes: number }[]
  daily: {
    date: string
    taskId?: 'solveWithCorrect' | 'reviewYesterday'
    target: number
    progress: number
    completed: boolean
    table?: number
    reviewFacts?: string[]
    reviewTables?: number[]
  }
  practiceByDay: DayPracticeEntry[]
  gamesStats: Record<string, { played: number; correct: number }>
  last7DaysRaw: { date: string; minutes: number; correct: number; wrong: number }[]
  cosmetics: CosmeticsState
  earnedBadges: string[]
  soundEnabled: boolean
  /** Local YYYY-MM-DD when the 3-month guided program started; set on first daily ensure if missing. */
  programStartDate?: string
  adaptive: AdaptiveState
  advancedMode: boolean
  /** Higher layer: harder mix, timers, combos (see games). */
  expertMode: boolean
  expertTimerEnabled: boolean
  expertTimerMs: number
  /** Best consecutive correct streak seen in expert games (badges). */
  expertBestCombo: number
  /** Boss stages cleared while expert mode was on. */
  expertBossWins: number
  advancedOfferDismissedDay?: string
  levelSkipOfferDismissedDay?: string
  tableMastery: Record<string, number>
  tableStats: Record<string, { c: number; w: number }>
  performanceBuffer: { correct: boolean; ms: number }[]
  difficultyScale: number
  speedBestApm: number
  lastBossLevelCompleted?: number
  hasCompletedOnboarding: boolean
  childStartingLevel: number
  firstTablesUnlocked: number[]
  onboardingCompletedAt?: string
  onboardingStep: number
  setLocale: (locale: LocaleCode) => void
  setSoundEnabled: (value: boolean) => void
  completeLanguageSelect: (locale: LocaleCode) => void
  completeOnboarding: (opts: { level: number; tables: number[]; difficulty: 'normal' | 'hard' }) => void
  setOnboardingStep: (step: number) => void
  ensureDaily: () => void
  recordAnswer: (opts: {
    gameId: string
    question: Question
    correct: boolean
    minutes?: number
    responseMs?: number
  }) => void
  addBossBonusStars: (amount: number) => void
  unlockNextTable: () => void
  setAdvancedMode: (value: boolean) => void
  setExpertMode: (value: boolean) => void
  setExpertTimerEnabled: (value: boolean) => void
  awardBonusCoins: (amount: number) => void
  recordExpertComboPeak: (combo: number) => void
  registerExpertBossClear: () => void
  dismissAdvancedOffer: () => void
  dismissLevelSkipOffer: () => void
  unlockFastTrack: () => void
  applyLevelSkip: () => void
  recordSpeedBest: (apm: number) => void
  markBossCompletedAtLevel: (level: number) => void
  maybeAwardBadges: () => void
  resetProgress: () => void
  getLast7Days: () => { date: string; minutes: number; correct: number; wrong: number }[]
  selectAvatar: (avatarId: string) => void
  setThemeId: (themeId: string) => void
  recordAdaptivePlay: (factKey: string, mode: string) => void
}

const dataDefaults = () => ({
  version: PROGRESS_VERSION,
  locale: 'tr' as LocaleCode,
  hasCompletedLanguageSelect: false,
  hasCompletedOnboarding: false,
  childStartingLevel: 1,
  firstTablesUnlocked: [1] as number[],
  onboardingCompletedAt: undefined,
  onboardingStep: 0,
  coins: 0,
  stars: 0,
  level: 1,
  xp: 0,
  streak: { current: 0, lastActiveDate: '' },
  unlockedTableIds: defaultUnlockedTables(),
  masteredFacts: [] as string[],
  weakFacts: [] as { key: string; mistakes: number }[],
  programStartDate: undefined,
  daily: generateDailyQuest(defaultUnlockedTables(), [], [], getLocalDay()),
  practiceByDay: [] as DayPracticeEntry[],
  gamesStats: {} as Record<string, { played: number; correct: number }>,
  last7DaysRaw: [] as {
    date: string
    minutes: number
    correct: number
    wrong: number
  }[],
  cosmetics: normalizeCosmetics({
    avatarId: 'cat',
    themeId: 'blue',
    stickersUnlocked: [],
    unlockedAvatarIds: ['cat'],
  }),
  earnedBadges: [] as string[],
  soundEnabled: true,
  adaptive: {
    recentRecommendedGameByFact: {} as Record<string, string>,
    lastAdaptiveGameAt: undefined,
  },
  advancedMode: false,
  expertMode: false,
  expertTimerEnabled: true,
  expertTimerMs: 5000,
  expertBestCombo: 0,
  expertBossWins: 0,
  advancedOfferDismissedDay: undefined,
  levelSkipOfferDismissedDay: undefined,
  tableMastery: {} as Record<string, number>,
  tableStats: {} as Record<string, { c: number; w: number }>,
  performanceBuffer: [] as { correct: boolean; ms: number }[],
  difficultyScale: 1,
  speedBestApm: 0,
  lastBossLevelCompleted: undefined,
})

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...dataDefaults(),

      setLocale: (locale) => {
        set({ locale })
      },

      setSoundEnabled: (value) => {
        set({ soundEnabled: value })
      },

      completeLanguageSelect: (locale) => {
        set({
          hasCompletedLanguageSelect: true,
          locale,
          streak: touchStreak(get().streak),
        })
      },

      completeOnboarding: ({ level, tables, difficulty }) => {
        set((state) => {
          const existingSet = new Set(state.unlockedTableIds)
          tables.forEach((n) => existingSet.add(toTableId(n)))
          return {
            hasCompletedOnboarding: true,
            childStartingLevel: level,
            firstTablesUnlocked: tables,
            onboardingCompletedAt: new Date().toISOString(),
            onboardingStep: 0,
            unlockedTableIds: [...existingSet] as TableId[],
            advancedMode: difficulty === 'hard',
          }
        })
      },

      setOnboardingStep: (step) => {
        set({ onboardingStep: Math.max(0, Math.min(3, step)) })
      },

      ensureDaily: () => {
        const today = getLocalDay()
        const s = get()
        if (s.daily.date === today && s.daily.target > 0) return
        const effectiveStart = s.programStartDate ?? today
        set({
          programStartDate: effectiveStart,
          daily: generateDailyQuest(
            s.unlockedTableIds,
            s.practiceByDay ?? [],
            s.weakFacts ?? [],
            effectiveStart,
          ),
        })
      },

      recordAnswer: ({ gameId, question, correct, minutes = 0, responseMs }) => {
        const prev = get()
        const key = factKey(question)
        const today = getLocalDay()
        let dailyJustCompleted = false
        let levelRewardUnlocked = false
        set((state) => {
          const effectiveStart = state.programStartDate ?? today
          const prevLevel = state.level
          const streak = touchStreak(state.streak)
          const gs = { ...state.gamesStats }
          const prevGs = gs[gameId] ?? { played: 0, correct: 0 }
          const newCorrectCount = prevGs.correct + (correct ? 1 : 0)
          gs[gameId] = {
            played: prevGs.played + 1,
            correct: newCorrectCount,
          }
          let weakFacts = state.weakFacts
          let masteredFacts = state.masteredFacts
          let coins = state.coins
          let stars = state.stars
          let xp = state.xp
          let level = state.level
          let cosmetics = normalizeCosmetics(state.cosmetics)
          const prevScale = state.difficultyScale ?? 1
          let difficultyScale = prevScale
          const perfBuf = [...(state.performanceBuffer ?? [])]
          let didPushPerf = false
          if (responseMs !== undefined && responseMs >= 0 && responseMs < 120_000) {
            perfBuf.push({ correct, ms: responseMs })
            didPushPerf = true
          } else if (!correct) {
            perfBuf.push({ correct: false, ms: 5000 })
            didPushPerf = true
          }
          while (perfBuf.length > 50) perfBuf.shift()
          if (didPushPerf) {
            const metrics = updateFlowMetrics(perfBuf)
            const frustration = detectFrustration(metrics)
            const boredom = detectBoredom(metrics)
            const fs = flowScore(metrics)
            difficultyScale = adjustDifficulty({
              currentScale: prevScale,
              frustration,
              boredom,
              flowScore: fs,
            })
            if (Math.round(prevScale * 100) !== Math.round(difficultyScale * 100)) {
              console.info(
                `difficultyScale: ${prevScale.toFixed(2)} → ${difficultyScale.toFixed(2)}`,
              )
            }
          }
          let tableMastery = { ...state.tableMastery }
          let tableStats = { ...state.tableStats }
          const touchTable = (n: number) => {
            if (n < 1 || n > 10) return
            const sk = String(n)
            const prevS = tableStats[sk] ?? { c: 0, w: 0 }
            const nextS = {
              c: prevS.c + (correct ? 1 : 0),
              w: prevS.w + (correct ? 0 : 1),
            }
            tableStats = { ...tableStats, [sk]: nextS }
            const tot = nextS.c + nextS.w
            const curM = tableMastery[sk] ?? 0
            if (tot >= 20 && nextS.c / tot >= 0.85 && curM < 3) {
              tableMastery = { ...tableMastery, [sk]: curM + 1 }
            }
          }
          touchTable(question.a)
          touchTable(question.b)
          if (correct) {
            coins += 1
            xp += 5
            if (!masteredFacts.includes(key)) {
              masteredFacts = [...masteredFacts, key]
            }
            while (xp >= level * 60) {
              xp -= level * 60
              level += 1
            }
            if (level > prevLevel) {
              const rewards = handleLevelRewards(prevLevel, level, cosmetics)
              cosmetics = rewards.cosmetics
              if (rewards.unlockedSomething) levelRewardUnlocked = true
            }
          } else {
            weakFacts = upsertWeak(weakFacts, key)
          }
          if (correct && gameId === 'sprint' && newCorrectCount > 0 && newCorrectCount % 5 === 0) {
            stars += 1
          }
          const last7DaysRaw = bumpDayStats(state.last7DaysRaw, today, {
            minutes: minutes ?? 0.15,
            correct: correct ? 1 : 0,
            wrong: correct ? 0 : 1,
          })

          const practiceByDay = upsertPracticeDay(
            state.practiceByDay ?? [],
            today,
            question,
          )

          let daily = state.daily
          if (daily.date !== today) {
            daily = generateDailyQuest(
              state.unlockedTableIds,
              practiceByDay,
              state.weakFacts,
              effectiveStart,
            )
          }
          if (correct && !daily.completed) {
            const touchesTask = countsTowardDaily(question, daily, key)
            if (touchesTask) {
              const wasCompleted = daily.completed
              const progress = Math.min(daily.target, daily.progress + 1)
              const completed = progress >= daily.target
              if (completed && !wasCompleted) {
                coins += 10
                stars += 2
                dailyJustCompleted = true
              }
              daily = { ...daily, progress, completed }
            }
          }

          return {
            ...state,
            programStartDate: effectiveStart,
            streak,
            gamesStats: gs,
            weakFacts,
            masteredFacts,
            coins,
            stars,
            xp,
            level,
            cosmetics,
            last7DaysRaw,
            practiceByDay,
            daily,
            performanceBuffer: perfBuf,
            difficultyScale,
            tableMastery,
            tableStats,
          }
        })
        get().maybeAwardBadges()
        const next = get()
        const soundOn = next.soundEnabled !== false
        if (!soundOn) return
        void import('@/services/sound').then((s) => {
          if (correct) s.playCorrect()
          else s.playWrong()
          if (next.level > prev.level) {
            window.setTimeout(() => s.playLevelUp(), 55)
          }
          if (levelRewardUnlocked) {
            window.setTimeout(() => s.playReward(), 115)
          }
          const milestones = [3, 7, 14, 30]
          if (
            milestones.includes(next.streak.current) &&
            next.streak.current !== prev.streak.current
          ) {
            window.setTimeout(() => s.playReward(), 115)
          }
          if (dailyJustCompleted) {
            window.setTimeout(() => s.playSuccess(), 175)
          }
        })
      },

      selectAvatar: (avatarId) => {
        set((state) => {
          const cos = normalizeCosmetics(state.cosmetics)
          const avatar = AVATARS.find((a) => a.id === avatarId)
          if (!avatar) {
            return { ...state, cosmetics: { ...cos, avatarId: 'cat' } }
          }
          const unlocked = new Set(cos.unlockedAvatarIds)
          if (avatar.cost === 0) {
            return { ...state, cosmetics: { ...cos, avatarId: avatar.id } }
          }
          if (unlocked.has(avatar.id)) {
            return { ...state, cosmetics: { ...cos, avatarId: avatar.id } }
          }
          if (state.coins < avatar.cost) {
            return state
          }
          return {
            ...state,
            coins: state.coins - avatar.cost,
            cosmetics: {
              ...cos,
              avatarId: avatar.id,
              unlockedAvatarIds: [...unlocked, avatar.id],
            },
          }
        })
      },

      setThemeId: (themeId) => {
        set((state) => {
          const cos = normalizeCosmetics(state.cosmetics)
          const theme = THEMES.find((t) => t.id === themeId)
          if (!theme) return state
          if (theme.requiresLevel !== undefined && state.level < theme.requiresLevel) {
            return state
          }
          return { ...state, cosmetics: { ...cos, themeId: theme.id } }
        })
      },

      recordAdaptivePlay: (factKey, mode) => {
        set((state) => ({
          ...state,
          adaptive: {
            recentRecommendedGameByFact: {
              ...state.adaptive.recentRecommendedGameByFact,
              [factKey]: mode,
            },
            lastAdaptiveGameAt: getLocalDay(),
          },
        }))
      },

      addBossBonusStars: (amount) => {
        set((s) => ({ ...s, stars: s.stars + amount }))
        get().maybeAwardBadges()
      },

      unlockNextTable: () => {
        set((state) => {
          const next = nextTableToUnlock(state.unlockedTableIds)
          if (!next) return state
          if (state.unlockedTableIds.includes(next)) return state
          return {
            ...state,
            unlockedTableIds: [...state.unlockedTableIds, next],
          }
        })
      },

      setAdvancedMode: (value) => {
        set({ advancedMode: value })
      },

      setExpertMode: (value) => {
        set({ expertMode: value })
      },

      setExpertTimerEnabled: (value) => {
        set({ expertTimerEnabled: value })
      },

      awardBonusCoins: (amount) => {
        const n = Math.max(0, Math.floor(amount))
        if (n <= 0) return
        set((s) => ({ coins: s.coins + n }))
        get().maybeAwardBadges()
      },

      recordExpertComboPeak: (combo) => {
        const v = Math.max(0, Math.floor(combo))
        if (v <= 0) return
        set((s) => ({
          expertBestCombo: Math.max(s.expertBestCombo ?? 0, v),
        }))
        get().maybeAwardBadges()
      },

      registerExpertBossClear: () => {
        set((s) => ({ expertBossWins: (s.expertBossWins ?? 0) + 1 }))
        get().maybeAwardBadges()
      },

      dismissAdvancedOffer: () => {
        set({ advancedOfferDismissedDay: getLocalDay() })
      },

      dismissLevelSkipOffer: () => {
        set({ levelSkipOfferDismissedDay: getLocalDay() })
      },

      unlockFastTrack: () => {
        set((state) => ({
          ...state,
          advancedMode: true,
          unlockedTableIds: fastTrackTableIds(state.unlockedTableIds),
        }))
        get().maybeAwardBadges()
      },

      applyLevelSkip: () => {
        get().unlockNextTable()
      },

      recordSpeedBest: (apm) => {
        set((state) => ({
          ...state,
          speedBestApm: Math.max(state.speedBestApm ?? 0, apm),
        }))
        get().maybeAwardBadges()
      },

      markBossCompletedAtLevel: (level) => {
        set({ lastBossLevelCompleted: level })
      },

      maybeAwardBadges: () => {
        set((state) => {
          const earned = new Set(state.earnedBadges)
          if (state.streak.current >= 3) earned.add('streak3')
          if (state.streak.current >= 7) earned.add('streak7')
          if (state.coins >= 50) earned.add('coins50')
          if (state.unlockedTableIds.length >= 4) earned.add('tables4')
          if (state.masteredFacts.length >= 30) earned.add('facts30')
          if (state.advancedMode) earned.add('advanced')
          if ((state.speedBestApm ?? 0) >= 12) earned.add('speedDemon')
          const masteryVals = Object.values(state.tableMastery ?? {})
          if (masteryVals.length >= 5 && masteryVals.filter((m) => m >= 3).length >= 3) {
            earned.add('crownTables')
          }
          if ((state.expertBestCombo ?? 0) >= 10) earned.add('expertLightning')
          if ((state.expertBossWins ?? 0) >= 1) earned.add('expertChampion')
          if ((state.expertBossWins ?? 0) >= 5) earned.add('expertMaster')
          if ((state.expertBossWins ?? 0) >= 10) earned.add('expertLegend')
          return { ...state, earnedBadges: [...earned] }
        })
      },

      resetProgress: () => {
        const loc = get().locale
        const sound = get().soundEnabled
        set({
          ...dataDefaults(),
          hasCompletedLanguageSelect: true,
          locale: loc,
          soundEnabled: sound,
        })
      },

      getLast7Days: () => rollLast7Days(get().last7DaysRaw),
    }),
    {
      name: STORAGE_KEY,
      merge: (persisted, current) => {
        const p = persisted as Partial<ProgressState> | undefined
        const c = current as ProgressState
        if (!p || typeof p !== 'object') return c
        const merged = { ...c, ...p } as ProgressState
        merged.cosmetics = normalizeCosmetics({
          ...c.cosmetics,
          ...(p.cosmetics as Partial<CosmeticsState> & { unlockedStickers?: string[] }),
        })
        merged.streak = sanitizePersistedStreak(p.streak, c.streak)
        merged.weakFacts = Array.isArray(p.weakFacts)
          ? p.weakFacts
              .filter(
                (w) =>
                  w &&
                  typeof w === 'object' &&
                  typeof (w as { key?: unknown }).key === 'string',
              )
              .map((w) => {
                const wk = w as { key: string; mistakes?: unknown }
                const mistakes =
                  typeof wk.mistakes === 'number' && Number.isFinite(wk.mistakes)
                    ? Math.max(0, Math.floor(wk.mistakes))
                    : 0
                return { key: wk.key, mistakes }
              })
          : c.weakFacts
        merged.practiceByDay = Array.isArray(p.practiceByDay)
          ? p.practiceByDay
              .filter(
                (e) =>
                  e &&
                  typeof e === 'object' &&
                  typeof (e as { date?: unknown }).date === 'string',
              )
              .map((e) => {
                const en = e as DayPracticeEntry
                return {
                  date: en.date,
                  factKeys: Array.isArray(en.factKeys) ? en.factKeys : [],
                  tables: Array.isArray(en.tables) ? en.tables : [],
                }
              })
          : c.practiceByDay
        merged.advancedMode = typeof p.advancedMode === 'boolean' ? p.advancedMode : c.advancedMode
        merged.expertMode = typeof p.expertMode === 'boolean' ? p.expertMode : c.expertMode
        merged.expertTimerEnabled =
          typeof p.expertTimerEnabled === 'boolean' ? p.expertTimerEnabled : c.expertTimerEnabled
        merged.expertTimerMs =
          typeof p.expertTimerMs === 'number' && Number.isFinite(p.expertTimerMs)
            ? Math.min(12000, Math.max(3000, Math.floor(p.expertTimerMs)))
            : c.expertTimerMs
        merged.expertBestCombo =
          typeof p.expertBestCombo === 'number' && Number.isFinite(p.expertBestCombo)
            ? Math.max(0, Math.floor(p.expertBestCombo))
            : c.expertBestCombo
        merged.expertBossWins =
          typeof p.expertBossWins === 'number' && Number.isFinite(p.expertBossWins)
            ? Math.max(0, Math.floor(p.expertBossWins))
            : c.expertBossWins
        merged.advancedOfferDismissedDay =
          typeof p.advancedOfferDismissedDay === 'string'
            ? p.advancedOfferDismissedDay
            : c.advancedOfferDismissedDay
        merged.levelSkipOfferDismissedDay =
          typeof p.levelSkipOfferDismissedDay === 'string'
            ? p.levelSkipOfferDismissedDay
            : c.levelSkipOfferDismissedDay
        merged.tableMastery =
          p.tableMastery && typeof p.tableMastery === 'object'
            ? { ...c.tableMastery, ...p.tableMastery }
            : c.tableMastery
        merged.tableStats =
          p.tableStats && typeof p.tableStats === 'object'
            ? { ...c.tableStats, ...p.tableStats }
            : c.tableStats
        merged.performanceBuffer = Array.isArray(p.performanceBuffer)
          ? p.performanceBuffer.filter(
              (x) =>
                x &&
                typeof x === 'object' &&
                typeof (x as { correct?: unknown }).correct === 'boolean' &&
                typeof (x as { ms?: unknown }).ms === 'number',
            )
          : c.performanceBuffer
        merged.difficultyScale =
          typeof p.difficultyScale === 'number' && Number.isFinite(p.difficultyScale)
            ? Math.min(1.3, Math.max(0.7, p.difficultyScale))
            : c.difficultyScale
        merged.speedBestApm =
          typeof p.speedBestApm === 'number' && Number.isFinite(p.speedBestApm)
            ? Math.max(0, p.speedBestApm)
            : c.speedBestApm
        merged.lastBossLevelCompleted =
          typeof p.lastBossLevelCompleted === 'number' ? p.lastBossLevelCompleted : c.lastBossLevelCompleted
        merged.adaptive = {
          recentRecommendedGameByFact: {
            ...c.adaptive.recentRecommendedGameByFact,
            ...(p.adaptive?.recentRecommendedGameByFact ?? {}),
          },
          lastAdaptiveGameAt: p.adaptive?.lastAdaptiveGameAt ?? c.adaptive.lastAdaptiveGameAt,
        }
        merged.hasCompletedOnboarding =
          typeof p.hasCompletedOnboarding === 'boolean'
            ? p.hasCompletedOnboarding
            : c.hasCompletedOnboarding
        merged.childStartingLevel =
          typeof p.childStartingLevel === 'number' && Number.isFinite(p.childStartingLevel)
            ? Math.max(1, Math.floor(p.childStartingLevel))
            : c.childStartingLevel
        merged.firstTablesUnlocked = Array.isArray(p.firstTablesUnlocked)
          ? (p.firstTablesUnlocked as unknown[]).filter(
              (n): n is number => typeof n === 'number',
            )
          : c.firstTablesUnlocked
        merged.onboardingCompletedAt =
          typeof p.onboardingCompletedAt === 'string'
            ? p.onboardingCompletedAt
            : c.onboardingCompletedAt
        merged.onboardingStep =
          typeof p.onboardingStep === 'number' && Number.isFinite(p.onboardingStep)
            ? Math.max(0, Math.min(3, Math.floor(p.onboardingStep)))
            : c.onboardingStep
        return merged
      },
      partialize: (s) => ({
        version: s.version,
        locale: s.locale,
        hasCompletedLanguageSelect: s.hasCompletedLanguageSelect,
        hasCompletedOnboarding: s.hasCompletedOnboarding,
        childStartingLevel: s.childStartingLevel,
        firstTablesUnlocked: s.firstTablesUnlocked,
        onboardingCompletedAt: s.onboardingCompletedAt,
        onboardingStep: s.onboardingStep,
        coins: s.coins,
        stars: s.stars,
        level: s.level,
        xp: s.xp,
        streak: s.streak,
        unlockedTableIds: s.unlockedTableIds,
        masteredFacts: s.masteredFacts,
        weakFacts: s.weakFacts,
        daily: s.daily,
        practiceByDay: s.practiceByDay,
        gamesStats: s.gamesStats,
        last7DaysRaw: s.last7DaysRaw,
        cosmetics: s.cosmetics,
        earnedBadges: s.earnedBadges,
        soundEnabled: s.soundEnabled,
        programStartDate: s.programStartDate,
        adaptive: s.adaptive,
        advancedMode: s.advancedMode,
        expertMode: s.expertMode,
        expertTimerEnabled: s.expertTimerEnabled,
        expertTimerMs: s.expertTimerMs,
        expertBestCombo: s.expertBestCombo,
        expertBossWins: s.expertBossWins,
        advancedOfferDismissedDay: s.advancedOfferDismissedDay,
        levelSkipOfferDismissedDay: s.levelSkipOfferDismissedDay,
        tableMastery: s.tableMastery,
        tableStats: s.tableStats,
        performanceBuffer: s.performanceBuffer,
        difficultyScale: s.difficultyScale,
        speedBestApm: s.speedBestApm,
        lastBossLevelCompleted: s.lastBossLevelCompleted,
      }),
    },
  ),
)

export function selectWeakKeys(store: ProgressState): string[] {
  return store.weakFacts.map((w) => w.key)
}

export function useWeakKeys(): string[] {
  return useProgressStore(useShallow(selectWeakKeys))
}
