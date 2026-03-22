import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { getDifficultyTierKey } from '@/lib/difficulty/difficultyTier'
import {
  correctAnswerFor,
  formatQuestionPrompt,
  pickGameQuestionForSession,
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
  const awardBonusCoins = useProgressStore((s) => s.awardBonusCoins)
  const recordExpertComboPeak = useProgressStore((s) => s.recordExpertComboPeak)
  const advancedMode = useProgressStore((s) => s.advancedMode)
  const expertMode = useProgressStore((s) => s.expertMode)
  const expertTimerEnabled = useProgressStore((s) => s.expertTimerEnabled !== false)
  const expertTimerMs = useProgressStore((s) => s.expertTimerMs ?? 5000)
  const difficultyScale = useProgressStore((s) => s.difficultyScale ?? 1)

  const [index, setIndex] = useState(0)
  const [streak, setStreak] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const questionShownAt = useRef(0)
  const gameRef = useRef<GameQuestion | null>(null)
  /** Cancels timer expiry if user already answered this question. */
  const answeredThisQuestion = useRef(false)

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const questions = useMemo(() => {
    const qs: GameQuestion[] = []
    for (let i = 0; i < 10; i += 1) {
      qs.push(
        pickGameQuestionForSession(unlocked, weak, {
          advancedMode,
          expertMode,
          difficultyScale,
        }),
      )
    }
    return qs
  }, [unlocked, weak, advancedMode, expertMode, difficultyScale])

  const game = questions[index] ?? questions[0]!

  useEffect(() => {
    gameRef.current = game
  }, [game])

  const tierKey = getDifficultyTierKey({ advancedMode, expertMode, difficultyScale })
  const difficultyBadge = (
    <span className="rounded-full bg-black/5 px-2 py-1">{t(`common:difficulty.${tierKey}`)}</span>
  )

  const [choices, setChoices] = useState<number[]>([])

  useEffect(() => {
    answeredThisQuestion.current = false
    questionShownAt.current = responseClockMs()
    const correct = correctAnswerFor(game)
    const wrong = wrongAnswersForGame(game, 3)
    const next = shuffleInPlace([correct, ...wrong])
    queueMicrotask(() => {
      setChoices(next)
    })
  }, [game])

  const advanceIndex = useCallback(() => {
    setIndex((i) => (i + 1 < questions.length ? i + 1 : 0))
  }, [questions.length])

  const applyComboRewards = useCallback(
    (nextStreak: number) => {
      if (!expertMode || nextStreak <= 0) return
      recordExpertComboPeak(nextStreak)
      if (nextStreak === 3) awardBonusCoins(2)
      if (nextStreak === 5) awardBonusCoins(3)
      if (nextStreak === 10) awardBonusCoins(5)
    },
    [awardBonusCoins, expertMode, recordExpertComboPeak],
  )

  const finishQuestion = useCallback(
    (ok: boolean, responseMs: number) => {
      const g = gameRef.current
      if (!g) return
      recordAnswer({ gameId: 'sprint', question: g.base, correct: ok, responseMs })
      if (ok) {
        setStreak((s) => {
          const nextStreak = s + 1
          applyComboRewards(nextStreak)
          return nextStreak
        })
        setMsg(t('common:feedback.doingGreat'))
      } else {
        setStreak(0)
        setMsg(t('common:feedback.tryAgain'))
      }
      window.setTimeout(() => {
        setMsg(null)
        advanceIndex()
      }, 550)
    },
    [advanceIndex, applyComboRewards, recordAnswer, t],
  )

  const onTimeExpired = useCallback(() => {
    if (answeredThisQuestion.current) return
    answeredThisQuestion.current = true
    const g = gameRef.current
    if (!g) return
    recordAnswer({
      gameId: 'sprint',
      question: g.base,
      correct: false,
      responseMs: expertTimerMs,
    })
    setStreak(0)
    setMsg(t('common:feedback.tryAgain'))
    window.setTimeout(() => {
      setMsg(null)
      advanceIndex()
    }, 550)
  }, [advanceIndex, expertTimerMs, recordAnswer, t])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- per-question timer reset */
    if (!expertMode || !expertTimerEnabled) {
      setTimeLeft(0)
      return
    }
    setTimeLeft(expertTimerMs)
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 100) {
          window.clearInterval(id)
          queueMicrotask(() => {
            if (!answeredThisQuestion.current) onTimeExpired()
          })
          return 0
        }
        return t - 100
      })
    }, 100)
    return () => window.clearInterval(id)
  }, [index, game, expertMode, expertTimerEnabled, expertTimerMs, onTimeExpired])

  function pick(n: number) {
    if (answeredThisQuestion.current) return
    answeredThisQuestion.current = true
    const ok = n === correctAnswerFor(game)
    const ms = Math.round(responseClockMs() - questionShownAt.current)
    finishQuestion(ok, ms)
  }

  const prompt = formatQuestionPrompt(game)
  const comboMult =
    streak >= 10 ? 5 : streak >= 5 ? 3 : streak >= 3 ? 2 : expertMode && streak > 0 ? 1 : 0

  return (
    <MainLayout title={t('games:sprint.title')} showBackTo="/games" headerRight={difficultyBadge}>
      <div className="text-sm text-[var(--muted)]">{t('games:sprint.subtitle')}</div>
      {!expertMode || !expertTimerEnabled ? (
        <div className="mt-2 text-sm font-extrabold">{t('games:sprint.noTimer')}</div>
      ) : (
        <div className="mt-2 text-sm font-extrabold text-[var(--muted)]">
          {t('games:expert.questionTime', { s: (timeLeft / 1000).toFixed(1) })}
        </div>
      )}

      <Card className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-extrabold text-[var(--muted)]">
            {t('games:shell.score', { n: index + 1 })}
          </div>
          <div className="text-lg font-extrabold">{t('games:sprint.streak', { n: streak })}</div>
        </div>
        {expertMode && comboMult >= 1 ? (
          <div className="mt-2 text-center text-sm font-extrabold text-[var(--primary-dark)]">
            {t('games:expert.combo', { n: comboMult })}
          </div>
        ) : null}
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
