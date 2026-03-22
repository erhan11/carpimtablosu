import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { parseTableQuery } from '@/lib/adaptive/adaptive'
import { useRecordAdaptiveSession } from '@/lib/adaptive/useAdaptiveSession'
import {
  normalizeFactKeyFromInput,
  pickQuestion,
  pickQuestionAdaptive,
  wrongAnswers,
} from '@/lib/math/questionBank'
import { shuffleInPlace } from '@/lib/math/shuffle'
import { responseClockMs } from '@/lib/perf'
import { useProgressStore, useWeakKeys } from '@/lib/progress/store'

const SESSION_SLOTS = 12

export function BalloonGame() {
  const { t, i18n } = useTranslation(['games', 'common'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const factKey = normalizeFactKeyFromInput(searchParams.get('fact'))
  const tableFocus = parseTableQuery(searchParams.get('table'))

  useRecordAdaptiveSession('balloon', factKey)

  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const weak = useWeakKeys()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)

  const slotRef = useRef(0)
  const questionShownAt = useRef(0)
  const [q, setQ] = useState(() =>
    factKey || tableFocus !== undefined
      ? pickQuestionAdaptive(unlocked, weak, factKey ?? undefined, 0, SESSION_SLOTS, tableFocus)
      : pickQuestion(unlocked, weak),
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [choices, setChoices] = useState<number[]>([])

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  useEffect(() => {
    questionShownAt.current = responseClockMs()
    const correct = q.a * q.b
    const wrong = wrongAnswers(correct, 3, 120)
    const next = shuffleInPlace([correct, ...wrong])
    queueMicrotask(() => {
      setChoices(next)
    })
  }, [q])

  function pick(n: number) {
    const ok = n === q.a * q.b
    const ms = Math.round(responseClockMs() - questionShownAt.current)
    recordAnswer({ gameId: 'balloon', question: q, correct: ok, responseMs: ms })
    setMsg(ok ? t('common:feedback.doingGreat') : t('common:feedback.tryAgain'))
    window.setTimeout(() => {
      setMsg(null)
      slotRef.current += 1
      const nextQ =
        factKey || tableFocus !== undefined
          ? pickQuestionAdaptive(
              unlocked,
              weak,
              factKey ?? undefined,
              slotRef.current,
              SESSION_SLOTS,
              tableFocus,
            )
          : pickQuestion(unlocked, weak)
      setQ(nextQ)
    }, 650)
  }

  return (
    <MainLayout title={t('games:balloon.title')} showBackTo="/games">
      <div className="text-sm text-[var(--muted)]">{t('games:balloon.subtitle')}</div>

      <Card className="mt-4">
        <div className="text-center text-5xl font-extrabold">
          {q.a} × {q.b}
        </div>
        <div className="mt-2 text-center text-sm text-[var(--muted)]">{t('games:balloon.pick')}</div>
        {msg ? (
          <div className="mt-3 text-center text-lg font-extrabold text-[var(--primary-dark)]">{msg}</div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {choices.map((n) => (
            <BigButton key={n} variant="accent" onClick={() => pick(n)}>
              🎈 {new Intl.NumberFormat(locale).format(n)}
            </BigButton>
          ))}
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
