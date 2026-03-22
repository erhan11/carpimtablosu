import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Celebration } from '@/components/ui/Celebration'
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
import { useProgressStore } from '@/lib/progress/store'
import { toTableId, type TableId } from '@/types/progress'

type Step = 'pick' | 'visual' | 'practice' | 'done'

export function LearnSession() {
  const { t, i18n } = useTranslation(['learn', 'common'])
  const [searchParams] = useSearchParams()
  const tableQuery = searchParams.get('table')
  const programStartDate = useProgressStore((s) => s.programStartDate)
  const unlocked = useProgressStore((s) => s.unlockedTableIds)
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

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

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

  const autoStarted = useRef(false)

  const startTable = useCallback((n: number) => {
    setTable(n)
    const facts = allFactsForTable(n)
    const smallEnough = facts.filter((f) => f.a * f.b <= 36)
    const vf = smallEnough[Math.min(2, smallEnough.length - 1)] ?? facts[0]!
    setVisualFact(vf)
    const pf = facts.slice(0, 3)
    setPracticeFacts(pf)
    setPracticeIndex(0)
    setCorrectCount(0)
    setStep('visual')
  }, [])

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
    const ok = value === q.a * q.b
    recordAnswer({ gameId: 'learn', question: q, correct: ok })
    const nextCorrect = correctCount + (ok ? 1 : 0)
    if (ok) {
      setFeedback('ok')
      setCorrectCount(nextCorrect)
    } else {
      setFeedback('soft')
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

  return (
    <MainLayout title={t('learn:title')} showBackTo="/">
      <Celebration show={showParty} />

      {step === 'pick' ? (
        <div className="grid grid-cols-2 gap-3">
          {unlocked.map((id: TableId) => {
            const n = parseTableId(id)
            const mark = focusSet.has(n) ? '⭐ ' : ''
            return (
              <BigButton key={id} variant="accent" onClick={() => startTable(n)}>
                {mark}
                {t('learn:tableLabel', { n })}
              </BigButton>
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
          <div className="mt-3 text-center text-xs text-[var(--muted)]">{t('learn:hint')}</div>
        </Card>
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
