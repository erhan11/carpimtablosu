import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Celebration } from '@/components/ui/Celebration'
import { CoachHintCard } from '@/components/CoachHintCard'
import { MainLayout } from '@/layouts/MainLayout'
import {
  allFactsForTable,
  parseTableId,
  wrongAnswers,
  type Question,
} from '@/lib/math/questionBank'
import { getLocalDay } from '@/lib/date/localDay'
import {
  focusPoolUnlocked,
  getEffectiveProgramStart,
  getPlanWeekRow,
} from '@/lib/plan/programWeek'
import { shuffleInPlace } from '@/lib/math/shuffle'
import {
  getMasteryLevel,
  masteryStarsCompact,
  masteryStarsPadded,
} from '@/lib/learn/masteryDisplay'
import { useProgressStore } from '@/lib/progress/store'
import { playReward } from '@/services/sound'
import { toTableId, type TableId } from '@/types/progress'
import { getCoachHint } from '@/lib/coach/aiCoach'

const MASTERY_LABEL_ORDER = ['starting', 'learning', 'strong', 'master'] as const

type Step = 'pick' | 'visual' | 'practice' | 'done'

export function LearnSession() {
  const { t, i18n } = useTranslation(['learn', 'common'])
  const [searchParams] = useSearchParams()
  const tableQuery = searchParams.get('table')
  const programStartDate = useProgressStore((s) => s.programStartDate)
  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const tableMastery = useProgressStore((s) => s.tableMastery)
  const unlockNext = useProgressStore((s) => s.unlockNextTable)
  const recordAnswer = useProgressStore((s) => s.recordAnswer)

  const unlockedSet = useMemo(() => new Set(unlocked), [unlocked])
  const focusSet = useMemo(() => {
    const start = getEffectiveProgramStart(programStartDate)
    const row = getPlanWeekRow(start, getLocalDay())
    return new Set(focusPoolUnlocked(row, unlocked))
  }, [programStartDate, unlocked])

  const [step, setStep] = useState<Step>('pick')
  const [table, setTable] = useState<number | null>(null)
  const [visualFact, setVisualFact] = useState<Question | null>(null)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [practiceFacts, setPracticeFacts] = useState<Question[]>([])
  const [feedback, setFeedback] = useState<'ok' | 'soft' | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [showParty, setShowParty] = useState(false)
  const [options, setOptions] = useState<number[]>([])
  const [masteryToast, setMasteryToast] = useState<string | null>(null)

  // Coach state
  const [wrongAttemptsOnCurrentQuestion, setWrongAttempts] = useState(0)
  const [currentHintLevel, setCurrentHintLevel] = useState<1 | 2 | 3 | 4 | null>(null)
  const [coachVisible, setCoachVisible] = useState(false)
  const [nudgeVisible, setNudgeVisible] = useState(false)
  const nudgeTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const coachLocale = i18n.language.startsWith('tr') ? ('tr' as const) : ('en' as const)
  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'
  const masteryToastClearRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const showMasteryStrip = table != null && step !== 'pick'
  const activeMasteryLevel = useMemo(() => {
    if (!showMasteryStrip || table == null) return null
    return getMasteryLevel(tableMastery ?? {}, table)
  }, [showMasteryStrip, table, tableMastery])

  useEffect(() => {
    return () => {
      if (masteryToastClearRef.current !== null) {
        window.clearTimeout(masteryToastClearRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const q = practiceFacts[practiceIndex]
    if (!q || !table) {
      queueMicrotask(() => {
        setOptions([])
      })
      return
    }
    const ans = q.a * q.b
    const wrong = wrongAnswers(ans, 3, 120)
    const next = shuffleInPlace([ans, ...wrong])
    queueMicrotask(() => {
      setOptions(next)
    })
  }, [practiceFacts, practiceIndex, table])

  // Reset coach state and start inactivity timer when question changes
  useEffect(() => {
    if (step !== 'practice') return
    resetCoachState()
    nudgeTimerRef.current = window.setTimeout(() => {
      setNudgeVisible(true)
    }, 8000)
    return () => {
      if (nudgeTimerRef.current !== null) {
        window.clearTimeout(nudgeTimerRef.current)
        nudgeTimerRef.current = null
      }
    }
  }, [practiceIndex, step]) // eslint-disable-line react-hooks/exhaustive-deps

  const autoStarted = useRef(false)

  function resetCoachState() {
    setWrongAttempts(0)
    setCurrentHintLevel(null)
    setCoachVisible(false)
    setNudgeVisible(false)
    if (nudgeTimerRef.current !== null) {
      window.clearTimeout(nudgeTimerRef.current)
      nudgeTimerRef.current = null
    }
  }

  const startTable = useCallback((n: number) => {
    setMasteryToast(null)
    if (masteryToastClearRef.current !== null) {
      window.clearTimeout(masteryToastClearRef.current)
      masteryToastClearRef.current = null
    }
    setTable(n)
    const facts = allFactsForTable(n)
    const smallEnough = facts.filter((f) => f.a * f.b <= 36)
    const vf = smallEnough[Math.min(2, smallEnough.length - 1)] ?? facts[0]!
    setVisualFact(vf)
    const pf = facts.slice(0, 3)
    setPracticeFacts(pf)
    setPracticeIndex(0)
    setCorrectCount(0)
    resetCoachState()
    setStep('visual')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoStarted.current || step !== 'pick' || !tableQuery) return
    const n = Number(tableQuery)
    if (!Number.isInteger(n) || n < 1 || n > 10) return
    const id = toTableId(n)
    if (!unlockedSet.has(id)) return
    autoStarted.current = true
    queueMicrotask(() => {
      startTable(n)
    })
  }, [step, tableQuery, unlockedSet, startTable])

  function beginPractice() {
    setStep('practice')
  }

  function pickAnswer(value: number) {
    if (!table) return
    const q = practiceFacts[practiceIndex]
    if (!q) return
    // Clear inactivity timer on any answer
    if (nudgeTimerRef.current !== null) {
      window.clearTimeout(nudgeTimerRef.current)
      nudgeTimerRef.current = null
    }
    const ok = value === q.a * q.b
    const tm = useProgressStore.getState().tableMastery ?? {}
    const beforeM = getMasteryLevel(tm, table)
    recordAnswer({ gameId: 'learn', question: q, correct: ok })
    const afterM = getMasteryLevel(useProgressStore.getState().tableMastery ?? {}, table)
    if (afterM > beforeM) {
      const label = t('learn:tableLabel', { n: table })
      setMasteryToast(t('learn:masteryLevelUp', { label }))
      if (masteryToastClearRef.current !== null) {
        window.clearTimeout(masteryToastClearRef.current)
      }
      masteryToastClearRef.current = window.setTimeout(() => {
        setMasteryToast(null)
        masteryToastClearRef.current = null
      }, 3200)
      window.setTimeout(() => playReward(), 160)
    }
    const nextCorrect = correctCount + (ok ? 1 : 0)
    if (ok) {
      setFeedback('ok')
      setCorrectCount(nextCorrect)
    } else {
      setFeedback('soft')
      setWrongAttempts((prev) => {
        const next = prev + 1
        if (next >= 2) setNudgeVisible(true)
        return next
      })
    }
    window.setTimeout(() => {
      setFeedback(null)
      if (practiceIndex + 1 >= practiceFacts.length) {
        setCorrectCount(nextCorrect)
        setStep('done')
        if (nextCorrect >= 2) {
          unlockNext()
          setShowParty(true)
          window.setTimeout(() => setShowParty(false), 1400)
        }
      } else {
        setPracticeIndex((i) => i + 1)
      }
    }, 650)
  }

  function buildCoachHint(level: 1 | 2 | 3 | 4) {
    const q = practiceFacts[practiceIndex]
    if (!q) return null
    return getCoachHint(
      {
        a: q.a,
        b: q.b,
        variant: 'standard',
        wrongAttemptsOnCurrentQuestion,
        masteryLevel: activeMasteryLevel ?? 0,
        gameMode: 'learn',
        advancedMode: false,
        expertMode: false,
      },
      level,
      coachLocale,
    )
  }

  return (
    <MainLayout title={t('learn:title')} showBackTo="/">
      <Celebration show={showParty} />

      {showMasteryStrip && activeMasteryLevel !== null ? (
        <div className="mb-3 rounded-2xl border border-black/5 bg-white/90 px-3 py-2.5 shadow-sm">
          {activeMasteryLevel === 0 ? (
            <div className="text-sm font-extrabold text-[var(--ink)]">
              {t('learn:mastery')}: {t('learn:masteryStarting')}
            </div>
          ) : (
            <>
              <div className="text-sm font-extrabold text-[var(--ink)]">
                {t('learn:mastery')}: {masteryStarsPadded(activeMasteryLevel)}
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted)]">
                {t(
                  `learn:masteryLabels.${
                    MASTERY_LABEL_ORDER[activeMasteryLevel]
                  }`,
                )}
              </div>
            </>
          )}
        </div>
      ) : null}

      {masteryToast ? (
        <div
          className="pointer-events-none fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/15 px-4 py-3 text-center text-sm font-extrabold text-[var(--ink)] shadow-md"
          role="status"
        >
          {masteryToast}
        </div>
      ) : null}

      {step === 'pick' ? (
        <div className="grid grid-cols-2 gap-3">
          {unlocked.map((id: TableId) => {
            const n = parseTableId(id)
            const mark = focusSet.has(n) ? '⭐ ' : ''
            const m = getMasteryLevel(tableMastery ?? {}, n)
            const stars = masteryStarsCompact(m)
            return (
              <div key={id} className="flex flex-col gap-1">
                <BigButton variant="accent" onClick={() => startTable(n)}>
                  {mark}
                  {t('learn:tableLabel', { n })}
                </BigButton>
                {stars ? (
                  <div
                    className="text-center text-xs leading-none tracking-tight text-[var(--muted)]"
                    aria-hidden
                  >
                    {stars}
                  </div>
                ) : null}
              </div>
            )
          })}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
            const id = toTableId(n)
            const isOpen = unlockedSet.has(id)
            if (isOpen) return null
            return (
              <BigButton key={id} variant="ghost" disabled>
                {t('learn:locked')} {n}
              </BigButton>
            )
          })}
        </div>
      ) : null}

      {step === 'visual' && visualFact && table ? (
        <Card>
          <div className="text-sm font-extrabold text-[var(--muted)]">{t('learn:stepVisual')}</div>
          <div className="mt-2 text-lg font-extrabold">
            {visualFact.a} × {visualFact.b}
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t('learn:stepVisualDesc', { a: visualFact.a, b: visualFact.b })}
          </p>
          <div
            className="mt-4 grid gap-2 rounded-3xl bg-[#f3f7ff] p-3"
            style={{
              gridTemplateColumns: `repeat(${visualFact.b}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: visualFact.a * visualFact.b }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-2xl bg-white text-2xl shadow-inner"
              >
                🍎
              </div>
            ))}
          </div>
          <div className="mt-4">
            <BigButton variant="primary" onClick={beginPractice}>
              {t('common:continue')}
            </BigButton>
          </div>
        </Card>
      ) : null}

      {step === 'practice' && table ? (
        <>
          <Card>
            <div className="text-sm font-extrabold text-[var(--muted)]">{t('learn:stepPractice')}</div>
            <div className="mt-3 text-center text-4xl font-extrabold">
              {practiceFacts[practiceIndex]?.a} × {practiceFacts[practiceIndex]?.b} = ?
            </div>
            <div className="mt-2 text-center text-sm text-[var(--muted)]">{t('learn:question')}</div>
            {feedback ? (
              <div className="mt-3 text-center text-lg font-extrabold">
                {feedback === 'ok' ? t('common:feedback.doingGreat') : t('common:feedback.tryAgain')}
              </div>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {options.map((n, idx) => (
                <BigButton key={`${n}-${idx}`} variant="primary" onClick={() => pickAnswer(n)}>
                  {new Intl.NumberFormat(locale).format(n)}
                </BigButton>
              ))}
            </div>
            {nudgeVisible && !coachVisible ? (
              <div className="mt-3 text-center text-sm text-[var(--muted)]">
                {t('learn:coach.nudge')}
              </div>
            ) : null}
            <div className="mt-2">
              <BigButton
                variant="ghost"
                onClick={() => {
                  setCurrentHintLevel(1)
                  setCoachVisible(true)
                  setNudgeVisible(false)
                }}
              >
                {t('learn:coach.help')}
              </BigButton>
            </div>
            <div className="mt-1 text-center text-xs text-[var(--muted)]">{t('learn:hint')}</div>
          </Card>
          {coachVisible && currentHintLevel ? (() => {
            const hint = buildCoachHint(currentHintLevel)
            if (!hint) return null
            return (
              <CoachHintCard
                hint={hint}
                onNextHint={() =>
                  setCurrentHintLevel((l) => (l !== null && l < 4 ? ((l + 1) as 1 | 2 | 3 | 4) : l))
                }
                onClose={() => setCoachVisible(false)}
              />
            )
          })() : null}
        </>
      ) : null}

      {step === 'done' ? (
        <Card>
          <div className="text-center text-2xl font-extrabold">{t('common:done')}</div>
          <p className="mt-2 text-center text-sm text-[var(--muted)]">
            {correctCount >= 2 ? t('common:feedback.yay') : t('common:feedback.greatTry')}
          </p>
          <div className="mt-4">
            <BigButton variant="accent" onClick={() => setStep('pick')}>
              {t('common:continue')}
            </BigButton>
          </div>
        </Card>
      ) : null}
    </MainLayout>
  )
}
