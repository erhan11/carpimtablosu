import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { pickQuestion, wrongAnswers } from '@/lib/math/questionBank'
import { shuffleInPlace } from '@/lib/math/shuffle'
import { useProgressStore, useWeakKeys } from '@/lib/progress/store'

export function BalloonGame() {
  const { t, i18n } = useTranslation(['games', 'common'])
  const navigate = useNavigate()
  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const weak = useWeakKeys()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)

  const [q, setQ] = useState(() => pickQuestion(unlocked, weak))
  const [msg, setMsg] = useState<string | null>(null)
  const [choices, setChoices] = useState<number[]>([])

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

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
    recordAnswer({ gameId: 'balloon', question: q, correct: ok })
    setMsg(ok ? t('common:feedback.doingGreat') : t('common:feedback.tryAgain'))
    window.setTimeout(() => {
      setMsg(null)
      setQ(pickQuestion(unlocked, weak))
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
