import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import type { RecoveryKind } from '@/lib/flow/flowEngine'
import { useFlowGameSession } from '@/lib/flow/useFlowGameSession'
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

  const {
    pickIntent,
    syncStreakFromGame,
    bumpFrustrationAfterAnswer,
    shouldSuggestBreak,
    setBreakDismissed,
  } = useFlowGameSession()

  const [index, setIndex] = useState(0)
  const [game, setGame] = useState<GameQuestion | null>(null)
  const [done, setDone] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [flowRecovery, setFlowRecovery] = useState<RecoveryKind>('none')
  const questionShownAt = useRef(0)
  const gameRef = useRef<GameQuestion | null>(null)
  const answeredThisQuestion = useRef(false)

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const loadQuestion = useCallback(
    (slotIndex: number) => {
      const { intent } = pickIntent(slotIndex, true)
      setFlowRecovery(intent.recoveryKind)
      const g = pickGameQuestionForSession(unlocked, weak, {
        advancedMode,
        expertMode,
        difficultyScale,
        mixedOnly: true,
        flowIntent: intent,
      })
      setGame(g)
    },
    [pickIntent, unlocked, weak, advancedMode, expertMode, difficultyScale],
  )

  useEffect(() => {
    if (done) return
    queueMicrotask(() => {
      loadQuestion(index)
    })
  }, [index, done, loadQuestion])

  useEffect(() => {
    if (game) syncStreakFromGame(game)
  }, [game, syncStreakFromGame])

  useEffect(() => {
    gameRef.current = game
  }, [game])

  const tierKey = getDifficultyTierKey({ advancedMode, expertMode, difficultyScale })
  const difficultyBadge = (
    <span className="rounded-full bg-black/5 px-2 py-1">{t(`common:difficulty.${tierKey}`)}</span>
  )

  const [choices, setChoices] = useState<number[]>([])

  useEffect(() => {
    if (!game) return
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
      bumpFrustrationAfterAnswer()
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
    [applyComboRewards, bumpFrustrationAfterAnswer, index, onComplete, recordAnswer, t],
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
    bumpFrustrationAfterAnswer()
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
  }, [bumpFrustrationAfterAnswer, expertTimerMs, index, onComplete, recordAnswer, t])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- per-question timer reset */
    if (!game || !expertMode || !expertTimerEnabled || done) {
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
    const ok = n === correctAnswerFor(game!)
    advanceOrComplete(ok)
  }

  const prompt = game ? formatQuestionPrompt(game) : ''
  const comboMult =
    streak >= 10 ? 5 : streak >= 5 ? 3 : streak >= 3 ? 2 : expertMode && streak > 0 ? 1 : 0

  return (
    <MainLayout title={t('games:mixed.title')} showBackTo="/games" headerRight={difficultyBadge}>
      <div className="text-sm text-[var(--muted)]">{t('games:mixed.subtitle')}</div>
      {!done && shouldSuggestBreak ? (
        <Card className="mt-3 border-[var(--primary)]/30 bg-[var(--primary)]/5">
          <div className="text-center text-lg font-extrabold">{t('games:flow.breakTitle')}</div>
          <div className="mt-1 text-center text-sm text-[var(--muted)]">{t('games:flow.breakBody')}</div>
          <div className="mt-3 flex justify-center">
            <BigButton variant="primary" onClick={() => setBreakDismissed(true)}>
              {t('games:flow.breakDismiss')}
            </BigButton>
          </div>
        </Card>
      ) : null}
      {!done && flowRecovery === 'switch_mode' ? (
        <div className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-center text-sm text-[var(--muted)]">
          {t('games:flow.recoverySwitch')}{' '}
          <Link to="/games/mixed" className="font-extrabold text-[var(--primary-dark)] underline">
            {t('games:flow.tryMixed')}
          </Link>
        </div>
      ) : null}
      {!done && flowRecovery === 'short_challenge' ? (
        <div className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-center text-sm text-[var(--muted)]">
          {t('games:flow.recoveryShort')}
        </div>
      ) : null}
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
        {!done && game ? (
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
        ) : null}
        {!done && !game ? (
          <div className="mt-4 text-center text-sm text-[var(--muted)]">{t('common:loading')}</div>
        ) : null}
        {done ? (
          <div className="mt-4 text-center text-xl font-extrabold">{t('games:mixed.complete')}</div>
        ) : null}
      </Card>

      <div className="mt-4">
        <BigButton variant="ghost" onClick={() => navigate('/games')}>
          {t('games:shell.exit')}
        </BigButton>
      </div>
    </MainLayout>
  )
}
