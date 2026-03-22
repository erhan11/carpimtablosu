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
import {
  PROGRESS_VERSION,
  type DayPracticeEntry,
  type LocaleCode,
  type TableId,
} from '@/types/progress'

const STORAGE_KEY = 'carpim-progress-v1'

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

function rollLast7Days(
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
  cosmetics: {
    avatarId: string
    themeId: string
    unlockedStickers: string[]
  }
  earnedBadges: string[]
  soundEnabled: boolean
  /** Local YYYY-MM-DD when the 3-month guided program started; set on first daily ensure if missing. */
  programStartDate?: string
  setLocale: (locale: LocaleCode) => void
  setSoundEnabled: (value: boolean) => void
  completeLanguageSelect: (locale: LocaleCode) => void
  ensureDaily: () => void
  recordAnswer: (opts: {
    gameId: string
    question: Question
    correct: boolean
    minutes?: number
  }) => void
  addBossBonusStars: (amount: number) => void
  unlockNextTable: () => void
  maybeAwardBadges: () => void
  resetProgress: () => void
  getLast7Days: () => { date: string; minutes: number; correct: number; wrong: number }[]
}

const dataDefaults = () => ({
  version: PROGRESS_VERSION,
  locale: 'tr' as LocaleCode,
  hasCompletedLanguageSelect: false,
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
  cosmetics: {
    avatarId: 'fox',
    themeId: 'sunny',
    unlockedStickers: [] as string[],
  },
  earnedBadges: [] as string[],
  soundEnabled: true,
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

      recordAnswer: ({ gameId, question, correct, minutes = 0 }) => {
        const prev = get()
        const key = factKey(question)
        const today = getLocalDay()
        let dailyJustCompleted = false
        set((state) => {
          const effectiveStart = state.programStartDate ?? today
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
            last7DaysRaw,
            practiceByDay,
            daily,
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

      maybeAwardBadges: () => {
        set((state) => {
          const earned = new Set(state.earnedBadges)
          if (state.streak.current >= 3) earned.add('streak3')
          if (state.streak.current >= 7) earned.add('streak7')
          if (state.coins >= 50) earned.add('coins50')
          if (state.unlockedTableIds.length >= 4) earned.add('tables4')
          if (state.masteredFacts.length >= 30) earned.add('facts30')
          return { ...state, earnedBadges: [...earned] }
        })
      },

      resetProgress: () => {
        const loc = get().locale
        const sound = get().soundEnabled
        set({ ...dataDefaults(), hasCompletedLanguageSelect: true, locale: loc, soundEnabled: sound })
      },

      getLast7Days: () => rollLast7Days(get().last7DaysRaw),
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        version: s.version,
        locale: s.locale,
        hasCompletedLanguageSelect: s.hasCompletedLanguageSelect,
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
