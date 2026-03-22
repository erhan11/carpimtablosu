import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { pickQuestion, wrongAnswers } from '@/lib/math/questionBank'
import { shuffleInPlace } from '@/lib/math/shuffle'
import { useProgressStore, useWeakKeys } from '@/lib/progress/store'

export function SprintGame() {
  const { t, i18n } = useTranslation(['games', 'common'])
  const navigate = useNavigate()
  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const weak = useWeakKeys()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)

  const [index, setIndex] = useState(0)
  const [streak, setStreak] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const questions = useMemo(() => {
    const qs = []
    for (let i = 0; i < 10; i += 1) qs.push(pickQuestion(unlocked, weak))
    return qs
  }, [unlocked, weak])

  const q = questions[index] ?? questions[0]!

  const [choices, setChoices] = useState<number[]>([])

  useEffect(() => {
    const correct = q.a * q.b
    const wrong = wrongAnswers(correct, 3, 120)
    const next = shuffleInPlace([correct, ...wrong])
    queueMicrotask(() => {
      setChoices(next)
    })
  }, [q])

  function pick(n: number) {
    const ok = n === q.a * q.b
    recordAnswer({ gameId: 'sprint', question: q, correct: ok })
    if (ok) {
      setStreak((s) => s + 1)
      setMsg(t('common:feedback.doingGreat'))
    } else {
      setStreak(0)
      setMsg(t('common:feedback.tryAgain'))
    }
    window.setTimeout(() => {
      setMsg(null)
      setIndex((i) => (i + 1 < questions.length ? i + 1 : 0))
    }, 550)
  }

  return (
    <MainLayout title={t('games:sprint.title')} showBackTo="/games">
      <div className="text-sm text-[var(--muted)]">{t('games:sprint.subtitle')}</div>
      <div className="mt-2 text-sm font-extrabold">{t('games:sprint.noTimer')}</div>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold text-[var(--muted)]">
            {t('games:shell.score', { n: index + 1 })}
          </div>
          <div className="text-lg font-extrabold">{t('games:sprint.streak', { n: streak })}</div>
        </div>
        <div className="mt-4 text-center text-5xl font-extrabold">
          {q.a} × {q.b}
        </div>
        {msg ? (
          <div className="mt-3 text-center text-lg font-extrabold text-[var(--primary-dark)]">{msg}</div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {choices.map((n) => (
            <BigButton key={`${n}-${index}`} variant="primary" onClick={() => pick(n)}>
              {new Intl.NumberFormat(locale).format(n)}
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
