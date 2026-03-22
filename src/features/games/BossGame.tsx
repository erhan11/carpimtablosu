import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Celebration } from '@/components/ui/Celebration'
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

export function BossGame() {
  const { t, i18n } = useTranslation(['games', 'common'])
  const navigate = useNavigate()
  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const weak = useWeakKeys()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)
  const addBossBonusStars = useProgressStore((s) => s.addBossBonusStars)
  const advancedMode = useProgressStore((s) => s.advancedMode)
  const difficultyScale = useProgressStore((s) => s.difficultyScale ?? 1)
  const level = useProgressStore((s) => s.level)
  const markBossCompletedAtLevel = useProgressStore((s) => s.markBossCompletedAtLevel)

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const questions = useMemo(() => {
    const qs: GameQuestion[] = []
    for (let i = 0; i < 10; i += 1) {
      qs.push(pickGameQuestion(unlocked, weak, { advancedMode, difficultyScale }))
    }
    return qs
  }, [unlocked, weak, advancedMode, difficultyScale])

  const [index, setIndex] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [party, setParty] = useState(false)
  const questionShownAt = useRef(0)

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
    recordAnswer({ gameId: 'boss', question: game.base, correct: ok, responseMs: ms })
    setMsg(ok ? t('common:feedback.doingGreat') : t('common:feedback.tryAgain'))
    window.setTimeout(() => {
      setMsg(null)
      if (index + 1 >= questions.length) {
        setDone(true)
        const bonus = advancedMode ? 5 : level % 5 === 0 ? 4 : 2
        addBossBonusStars(bonus)
        markBossCompletedAtLevel(level)
        setParty(true)
        window.setTimeout(() => setParty(false), 1400)
        return
      }
      setIndex((i) => i + 1)
    }, 550)
  }

  const prompt = formatQuestionPrompt(game)

  return (
    <MainLayout title={t('games:boss.title')} showBackTo="/games">
      <Celebration show={party} />

      <div className="text-sm text-[var(--muted)]">{t('games:boss.subtitle')}</div>

      <Card className="mt-4">
        <div className="text-center text-sm font-extrabold text-[var(--muted)]">
          {done
            ? t('games:boss.complete')
            : t('games:boss.progress', { current: index + 1, total: questions.length })}
        </div>
        {!done ? (
          <>
            <div className="mt-4 text-center text-4xl font-extrabold leading-tight">{prompt}</div>
            {msg ? (
              <div className="mt-3 text-center text-lg font-extrabold text-[var(--primary-dark)]">{msg}</div>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {choices.map((n) => (
                <BigButton key={`${n}-${index}`} variant="accent" onClick={() => pick(n)}>
                  {new Intl.NumberFormat(locale).format(n)}
                </BigButton>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4 text-center text-2xl font-extrabold">{t('games:boss.complete')}</div>
        )}
      </Card>

      <div className="mt-4">
        <BigButton variant="ghost" onClick={() => navigate('/games')}>
          {t('games:shell.exit')}
        </BigButton>
      </div>
    </MainLayout>
  )
}
