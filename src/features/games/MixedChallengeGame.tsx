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

const TOTAL = 10

export function MixedChallengeGame() {
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

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const questions = useMemo(() => {
    const qs: GameQuestion[] = []
    for (let i = 0; i < TOTAL; i += 1) {
      qs.push(
        pickGameQuestionForSession(unlocked, weak, {
          advancedMode,
          expertMode,
          difficultyScale,
          mixedOnly: true,
        }),
      )
    }
    return qs
  }, [unlocked, weak, advancedMode, expertMode, difficultyScale])

  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const questionShownAt = useRef(0)
  const gameRef = useRef<GameQuestion | null>(null)
  const answeredThisQuestion = useRef(false)

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
    queueMicrotask(() => setChoices(next))
  }, [game])

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

  const onComplete = useCallback(() => {
    setDone(true)
    awardBonusCoins(5)
  }, [awardBonusCoins])

  const advanceOrComplete = useCallback(
    (ok: boolean) => {
      const g = gameRef.current
      if (!g) return
      const ms = Math.round(responseClockMs() - questionShownAt.current)
      recordAnswer({ gameId: 'mixed', question: g.base, correct: ok, responseMs: ms })
      setMsg(ok ? t('common:feedback.doingGreat') : t('common:feedback.tryAgain'))
      if (ok) {
        setStreak((s) => {
          const next = s + 1
          applyComboRewards(next)
          return next
        })
      } else {
        setStreak(0)
      }
      window.setTimeout(() => {
        setMsg(null)
        if (index + 1 >= TOTAL) {
          onComplete()
          return
        }
        setIndex((i) => i + 1)
      }, 550)
    },
    [applyComboRewards, index, onComplete, recordAnswer, t],
  )

  const onTimeExpired = useCallback(() => {
    if (answeredThisQuestion.current) return
    answeredThisQuestion.current = true
    const g = gameRef.current
    if (!g) return
    recordAnswer({
      gameId: 'mixed',
      question: g.base,
      correct: false,
      responseMs: expertTimerMs,
    })
    setStreak(0)
    setMsg(t('common:feedback.tryAgain'))
    window.setTimeout(() => {
      setMsg(null)
      if (index + 1 >= TOTAL) {
        onComplete()
        return
      }
      setIndex((i) => i + 1)
    }, 550)
  }, [expertTimerMs, index, onComplete, recordAnswer, t])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- per-question timer reset */
    if (!expertMode || !expertTimerEnabled || done) {
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
  }, [index, game, expertMode, expertTimerEnabled, expertTimerMs, done, onTimeExpired])

  function pick(n: number) {
    if (done) return
    if (answeredThisQuestion.current) return
    answeredThisQuestion.current = true
    const ok = n === correctAnswerFor(game)
    advanceOrComplete(ok)
  }

  const prompt = formatQuestionPrompt(game)
  const comboMult =
    streak >= 10 ? 5 : streak >= 5 ? 3 : streak >= 3 ? 2 : expertMode && streak > 0 ? 1 : 0

  return (
    <MainLayout title={t('games:mixed.title')} showBackTo="/games" headerRight={difficultyBadge}>
      <div className="text-sm text-[var(--muted)]">{t('games:mixed.subtitle')}</div>
      {expertMode && expertTimerEnabled && !done ? (
        <div className="mt-2 text-sm font-extrabold text-[var(--muted)]">
          {t('games:expert.questionTime', { s: (timeLeft / 1000).toFixed(1) })}
        </div>
      ) : null}

      <Card className="mt-4">
        <div className="text-center text-sm font-extrabold text-[var(--muted)]">
          {done
            ? t('games:mixed.complete')
            : t('games:mixed.progress', { current: index + 1, total: TOTAL })}
        </div>
        {expertMode && comboMult >= 1 && !done ? (
          <div className="mt-2 text-center text-sm font-extrabold text-[var(--primary-dark)]">
            {t('games:expert.combo', { n: comboMult })}
          </div>
        ) : null}
        {!done ? (
          <>
            <div className="mt-4 text-center text-4xl font-extrabold leading-tight">{prompt}</div>
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
          </>
        ) : (
          <div className="mt-4 text-center text-xl font-extrabold">{t('games:mixed.complete')}</div>
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
