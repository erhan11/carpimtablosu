import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { parseTableQuery } from '@/lib/adaptive/adaptive'
import { useRecordAdaptiveSession } from '@/lib/adaptive/useAdaptiveSession'
import {
  factKey,
  normalizeFactKeyFromInput,
  pickQuestion,
  pickQuestionAdaptive,
  type Question,
} from '@/lib/math/questionBank'
import { useProgressStore, useWeakKeys } from '@/lib/progress/store'

export function MatchGame() {
  const { t, i18n } = useTranslation(['games', 'common'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetFactKey = normalizeFactKeyFromInput(searchParams.get('fact'))
  const tableFocus = parseTableQuery(searchParams.get('table'))

  useRecordAdaptiveSession('match', targetFactKey)

  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const weak = useWeakKeys()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)

  const [round, setRound] = useState(0)
  const advanceGuardRef = useRef(false)

  const questions = useMemo(() => {
    const qs: Question[] = []
    for (let i = 0; i < 4; i += 1) {
      qs.push(
        targetFactKey || tableFocus !== undefined
          ? pickQuestionAdaptive(unlocked, weak, targetFactKey ?? undefined, i, 4, tableFocus)
          : pickQuestion(unlocked, weak),
      )
    }
    return qs
  // eslint-disable-next-line react-hooks/exhaustive-deps -- round bumps deck
  }, [unlocked, weak, round, targetFactKey, tableFocus])

  const answers = useMemo(() => {
    const nums = questions.map((q) => q.a * q.b)
    return [...nums].sort((a, b) => a - b)
  }, [questions])

  const [matchedKeys, setMatchedKeys] = useState<Set<string>>(() => new Set())
  const [pickedQ, setPickedQ] = useState<Question | null>(null)
  const [pickedN, setPickedN] = useState<number | null>(null)
  const [hint, setHint] = useState(() => t('games:match.tapFirst'))

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  useEffect(() => {
    const allDone =
      questions.length > 0 && questions.every((q) => matchedKeys.has(factKey(q)))
    if (!allDone) {
      advanceGuardRef.current = false
      return
    }
    if (advanceGuardRef.current) return
    advanceGuardRef.current = true
    queueMicrotask(() => {
      setRound((r) => r + 1)
      setMatchedKeys(new Set())
      setPickedQ(null)
      setPickedN(null)
      setHint(t('games:match.tapFirst'))
    })
  }, [questions, matchedKeys, t])

  function isMatched(q: Question) {
    return matchedKeys.has(factKey(q))
  }

  function attemptMatch(q: Question, n: number) {
    const ok = q.a * q.b === n
    recordAnswer({ gameId: 'match', question: q, correct: ok })
    if (ok) {
      setMatchedKeys((prev) => new Set(prev).add(factKey(q)))
      setHint(t('games:match.matched'))
    } else {
      setHint(t('common:feedback.tryAgain'))
    }
    setPickedQ(null)
    setPickedN(null)
    window.setTimeout(() => setHint(t('games:match.tapFirst')), 700)
  }

  return (
    <MainLayout title={t('games:match.title')} showBackTo="/games">
      <div className="text-sm text-[var(--muted)]">{t('games:match.subtitle')}</div>

      <Card className="mt-4">
        <div className="text-center text-sm font-extrabold text-[var(--muted)]">{hint}</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            {questions.map((q, i) => {
              const done = isMatched(q)
              const active = pickedQ === q
              return (
                <button
                  key={`expr-${round}-${i}`}
                  type="button"
                  disabled={done}
                  onClick={() => {
                    if (pickedN !== null) {
                      attemptMatch(q, pickedN)
                      return
                    }
                    setPickedQ(q)
                    setPickedN(null)
                    setHint(t('games:match.tapSecond'))
                  }}
                  className={`rounded-2xl border-2 px-3 py-4 text-lg font-extrabold ${
                    done
                      ? 'border-[var(--success)] bg-[#e9fffb]'
                      : active
                        ? 'border-[var(--primary)] bg-[#eef5ff]'
                        : 'border-[#e6edf7] bg-white'
                  }`}
                >
                  {done ? '✅ ' : ''}
                  {q.a} × {q.b}
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-2">
            {answers.map((n, idx) => {
              const paired = questions.some((q) => q.a * q.b === n && isMatched(q))
              const active = pickedN === n
              return (
                <button
                  key={`${n}-${idx}`}
                  type="button"
                  disabled={paired}
                  onClick={() => {
                    if (pickedQ) {
                      attemptMatch(pickedQ, n)
                      return
                    }
                    setPickedN(n)
                    setPickedQ(null)
                    setHint(t('games:match.tapSecond'))
                  }}
                  className={`rounded-2xl border-2 px-3 py-4 text-lg font-extrabold ${
                    paired
                      ? 'border-[var(--success)] bg-[#e9fffb]'
                      : active
                        ? 'border-[var(--primary)] bg-[#eef5ff]'
                        : 'border-[#e6edf7] bg-white'
                  }`}
                >
                  {paired ? '✅ ' : ''}
                  {new Intl.NumberFormat(locale).format(n)}
                </button>
              )
            })}
          </div>
        </div>
        <div className="mt-3 text-center text-xs text-[var(--muted)]">
          {t('games:match.tapFirst')} / {t('games:match.tapSecond')}
        </div>
      </Card>

      <div className="mt-4">
        <BigButton variant="ghost" onClick={() => navigate('/games')}>
          {t('games:shell.exit')}
        </BigButton>
      </div>
    </MainLayout>
  )
}
