import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { getLocalDay } from '@/lib/date/localDay'
import {
  focusPoolUnlocked,
  getEffectiveProgramStart,
  getPlanWeekIndex,
  getPlanWeekRow,
  PLAN_WEEKS,
  weekFocusNumbers,
} from '@/lib/plan/programWeek'
import { yesterdayFrom } from '@/lib/progress/dailyQuest'
import {
  buildAdaptiveGamePath,
  formatFactDisplay,
  nextAdaptiveMode,
  pickWeakFactForAdaptive,
} from '@/lib/adaptive/adaptive'
import { formatNumber } from '@/lib/format'
import { useProgressStore } from '@/lib/progress/store'

function StatPill({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-sm font-extrabold shadow">
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  )
}

export function HomeScreen() {
  const { t, i18n } = useTranslation(['home', 'common', 'learn', 'games'])
  const coins = useProgressStore((s) => s.coins)
  const stars = useProgressStore((s) => s.stars)
  const streak = useProgressStore((s) => s.streak)
  const level = useProgressStore((s) => s.level)
  const mastered = useProgressStore((s) => s.masteredFacts.length)
  const daily = useProgressStore((s) => s.daily)
  const practiceByDay = useProgressStore((s) => s.practiceByDay ?? [])
  const ensureDaily = useProgressStore((s) => s.ensureDaily)
  const programStartDate = useProgressStore((s) => s.programStartDate)
  const unlockedIds = useProgressStore((s) => s.unlockedTableIds)
  const weakFacts = useProgressStore((s) => s.weakFacts)
  const adaptiveState = useProgressStore((s) => s.adaptive)

  const today = getLocalDay()
  const yesterday = yesterdayFrom(today)
  const yesterdayPractice = practiceByDay.find((d) => d.date === yesterday)
  const noYesterdayPractice =
    !yesterdayPractice ||
    (yesterdayPractice.factKeys.length === 0 && yesterdayPractice.tables.length === 0)
  const showNoYesterdayHint =
    !daily.completed &&
    (daily.taskId ?? 'solveWithCorrect') === 'solveWithCorrect' &&
    noYesterdayPractice

  useEffect(() => {
    ensureDaily()
  }, [ensureDaily])

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const effectiveStart = getEffectiveProgramStart(programStartDate)
  const weekRow = getPlanWeekRow(effectiveStart, today)
  const weekIndex = getPlanWeekIndex(effectiveStart, today)
  const focusNums = useMemo(() => weekFocusNumbers(weekRow), [weekRow])
  const focusListText = useMemo(() => {
    const lf = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' })
    return lf.format(focusNums.map((n) => t('learn:tableLabel', { n })))
  }, [focusNums, locale, t])

  const focusPool = useMemo(
    () => focusPoolUnlocked(weekRow, unlockedIds),
    [weekRow, unlockedIds],
  )

  const recommendedTo =
    (daily.taskId ?? 'solveWithCorrect') === 'reviewYesterday'
      ? '/games'
      : focusPool.length > 0
        ? `/learn?table=${focusPool[0]}`
        : '/games'

  const adaptiveRec = useMemo(() => {
    const factKey = pickWeakFactForAdaptive(weakFacts, unlockedIds)
    if (!factKey) return null
    const mode = nextAdaptiveMode(adaptiveState.recentRecommendedGameByFact, factKey)
    return {
      factKey,
      mode,
      to: buildAdaptiveGamePath(mode, factKey),
    }
  }, [weakFacts, unlockedIds, adaptiveState.recentRecommendedGameByFact])

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col gap-4 px-4 pb-10 pt-[max(16px,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold">{t('home:greeting')}</div>
          <div className="mt-1 text-sm text-[var(--muted)]">{t('home:tagline')}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/profile"
            className="inline-flex min-h-[44px] min-w-[56px] flex-col items-center justify-center rounded-2xl bg-white/80 px-2 py-1 text-center text-[10px] font-extrabold leading-tight shadow"
          >
            <span className="text-lg leading-none">👤</span>
            {t('home:nav.profile')}
          </Link>
          <Link
            to="/settings"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-white/80 px-3 font-extrabold shadow"
          >
            ⚙️
          </Link>
        </div>
      </header>

      <div className="rounded-2xl bg-white/70 px-3 py-2 text-sm shadow">
        <div className="font-extrabold text-[var(--primary-dark)]">
          {t('home:weeklyPlan.currentWeek', {
            current: weekIndex + 1,
            total: PLAN_WEEKS.length,
          })}
        </div>
        <div className="mt-0.5 text-[var(--muted)]">{t('home:weeklyPlan.thisWeekFocus', { tables: focusListText })}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatPill emoji="🔥" label={t('home:stats.streak', { n: streak.current })} />
        <StatPill
          emoji="🪙"
          label={t('home:stats.coins', { n: formatNumber(coins, locale) })}
        />
        <StatPill
          emoji="⭐"
          label={t('home:stats.stars', { n: formatNumber(stars, locale) })}
        />
        <StatPill emoji="🧮" label={t('common:numbers.level', { n: level })} />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold">{t('home:dailyQuest.title')}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              {daily.completed ? (
                t('home:dailyQuest.complete')
              ) : (daily.taskId ?? 'solveWithCorrect') === 'reviewYesterday' ? (
                t('home:dailyQuest.reviewYesterday', { n: daily.target })
              ) : (
                <>
                  {t('home:dailyQuest.task', {
                    n: daily.target,
                    table: formatNumber(daily.table ?? 1, locale),
                  })}
                </>
              )}
            </div>
            {showNoYesterdayHint ? (
              <div className="mt-1 text-xs text-[var(--muted)]">{t('home:dailyQuest.noYesterdayData')}</div>
            ) : null}
            <div className="mt-1 text-xs text-[var(--muted)]">{t('home:dailyQuest.rewardHint')}</div>
          </div>
          <div className="text-3xl font-extrabold">{daily.completed ? '✅' : '🎯'}</div>
        </div>
        <div className="mt-3">
          <ProgressBar value={daily.progress} max={daily.target} />
          <div className="mt-2 text-center text-xs font-bold text-[var(--muted)]">
            {t('home:dailyQuest.progress', { current: daily.progress, target: daily.target })}
          </div>
        </div>
        <Link
          to={recommendedTo}
          className="mt-4 block rounded-2xl bg-[var(--primary)]/15 px-4 py-3 text-center font-extrabold text-[var(--primary-dark)]"
        >
          {t('home:cards.todayGame')} →
        </Link>
      </Card>
      </motion.div>

      {adaptiveRec ? (
        <Card className="border-2 border-[var(--primary)]/20 bg-white/90 px-3 py-3 shadow">
          <div className="text-sm font-extrabold text-[var(--primary-dark)]">
            {t('home:adaptive.recommendedForYou')}
          </div>
          <div className="mt-1 text-sm">
            {t('home:adaptive.practiceFactWithGame', {
              fact: formatFactDisplay(adaptiveRec.factKey, locale),
              game: t(`games:modes.${adaptiveRec.mode}`),
            })}
          </div>
          <div className="mt-1 text-xs text-[var(--muted)]">{t('home:adaptive.adaptiveSuggestion')}</div>
          <Link
            to={adaptiveRec.to}
            className="mt-3 block rounded-2xl bg-[var(--accent)]/20 px-4 py-3 text-center font-extrabold text-[var(--primary-dark)]"
          >
            {t('home:adaptive.cta')} →
          </Link>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        <Link to="/learn">
          <Card className="active:scale-[0.99]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">{t('home:cards.learn')}</div>
                <div className="text-sm text-[var(--muted)]">{t('home:cards.learnHint')}</div>
              </div>
              <div className="text-4xl">🧠</div>
            </div>
          </Card>
        </Link>

        <Link to="/review">
          <Card className="active:scale-[0.99]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">{t('home:cards.review')}</div>
                <div className="text-sm text-[var(--muted)]">{t('home:cards.reviewHint')}</div>
              </div>
              <div className="text-4xl">🔁</div>
            </div>
          </Card>
        </Link>

        <Link to="/badges">
          <Card className="active:scale-[0.99]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">{t('home:cards.badges')}</div>
                <div className="text-sm text-[var(--muted)]">{t('home:cards.badgesHint')}</div>
              </div>
              <div className="text-4xl">🏅</div>
            </div>
          </Card>
        </Link>

        <Link to="/parent">
          <Card className="active:scale-[0.99]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">{t('home:cards.parent')}</div>
                <div className="text-sm text-[var(--muted)]">{t('home:cards.parentHint')}</div>
              </div>
              <div className="text-4xl">👪</div>
            </div>
          </Card>
        </Link>

        <Link to="/games">
          <Card className="active:scale-[0.99]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold">{t('home:games.title')}</div>
                <div className="text-sm text-[var(--muted)]">{t('home:games.pick')}</div>
              </div>
              <div className="text-4xl">🎮</div>
            </div>
          </Card>
        </Link>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold">{t('home:cards.learned')}</div>
            <div className="text-sm text-[var(--muted)]">
              {t('home:cards.learnedHint', { count: formatNumber(mastered, locale) })}
            </div>
          </div>
          <div className="text-3xl">✨</div>
        </div>
      </Card>
    </div>
  )
}
