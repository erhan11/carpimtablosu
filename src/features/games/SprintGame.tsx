import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import {
  correctAnswerFor,
  formatQuestionPrompt,
  pickGameQuestion,
  wrongAnswersForGame,
  type GameQuestion,
} from '@/lib/math/advancedQuestions'
import { shuffleInPlace } from '@/lib/math/shuffle'
import { responseClockMs } from '@/lib/perf'
import { useProgressStore, useWeakKeys } from '@/lib/progress/store'

export function SprintGame() {
  const { t, i18n } = useTranslation(['games', 'common'])
  const navigate = useNavigate()
  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const weak = useWeakKeys()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)
  const advancedMode = useProgressStore((s) => s.advancedMode)
  const difficultyScale = useProgressStore((s) => s.difficultyScale ?? 1)

  const [index, setIndex] = useState(0)
  const [streak, setStreak] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const questionShownAt = useRef(0)

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const questions = useMemo(() => {
    const qs: GameQuestion[] = []
    for (let i = 0; i < 10; i += 1) {
      qs.push(pickGameQuestion(unlocked, weak, { advancedMode, difficultyScale }))
    }
    return qs
  }, [unlocked, weak, advancedMode, difficultyScale])

  const game = questions[index] ?? questions[0]!

  const [choices, setChoices] = useState<number[]>([])

  useEffect(() => {
    questionShownAt.current = responseClockMs()
    const correct = correctAnswerFor(game)
    const wrong = wrongAnswersForGame(game, 3)
    const next = shuffleInPlace([correct, ...wrong])
    queueMicrotask(() => {
      setChoices(next)
    })
  }, [game])

  function pick(n: number) {
    const ok = n === correctAnswerFor(game)
    const ms = Math.round(responseClockMs() - questionShownAt.current)
    recordAnswer({ gameId: 'sprint', question: game.base, correct: ok, responseMs: ms })
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

  const prompt = formatQuestionPrompt(game)

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
        <div className="mt-4 text-center text-5xl font-extrabold leading-tight">{prompt}</div>
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
