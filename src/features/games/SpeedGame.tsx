import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Celebration } from '@/components/ui/Celebration'
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

const ROUND_SEC = 60

export function SpeedGame() {
  const { t, i18n } = useTranslation(['games', 'common'])
  const navigate = useNavigate()
  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const weak = useWeakKeys()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)
  const recordSpeedBest = useProgressStore((s) => s.recordSpeedBest)
  const advancedMode = useProgressStore((s) => s.advancedMode)
  const expertMode = useProgressStore((s) => s.expertMode)
  const difficultyScale = useProgressStore((s) => s.difficultyScale ?? 1)
  const awardBonusCoins = useProgressStore((s) => s.awardBonusCoins)
  const recordExpertComboPeak = useProgressStore((s) => s.recordExpertComboPeak)
  const speedBestApm = useProgressStore((s) => s.speedBestApm ?? 0)

  const {
    pickIntent,
    syncStreakFromGame,
    bumpFrustrationAfterAnswer,
    shouldSuggestBreak,
    setBreakDismissed,
  } = useFlowGameSession()

  const slotRef = useRef(0)
  const [flowRecovery, setFlowRecovery] = useState<RecoveryKind>('none')

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready')
  const [remainMs, setRemainMs] = useState(ROUND_SEC * 1000)
  const [correctCount, setCorrectCount] = useState(0)
  const [game, setGame] = useState<GameQuestion | null>(null)
  const [choices, setChoices] = useState<number[]>([])
  const [party, setParty] = useState(false)
  const [streak, setStreak] = useState(0)
  const questionShownAt = useRef<number>(0)
  const endedRef = useRef(false)
  const [roundBaselineBest, setRoundBaselineBest] = useState(0)
  // Increments each new question; keep `remainMs` out of list keys (timer remounts can drop clicks).
  const [questionKey, setQuestionKey] = useState(0)

  const pushQuestion = useCallback(() => {
    const slot = slotRef.current
    const { intent } = pickIntent(slot)
    setFlowRecovery(intent.recoveryKind)
    slotRef.current += 1
    const g = pickGameQuestionForSession(unlocked, weak, {
      advancedMode,
      expertMode,
      difficultyScale,
      flowIntent: intent,
    })
    setGame(g)
    questionShownAt.current = responseClockMs()
    const ca = correctAnswerFor(g)
    const wrong = wrongAnswersForGame(g, 3)
    setChoices(shuffleInPlace([ca, ...wrong]))
    setQuestionKey((k) => k + 1)
  }, [pickIntent, unlocked, weak, advancedMode, expertMode, difficultyScale])

  useEffect(() => {
    if (game) syncStreakFromGame(game)
  }, [game, syncStreakFromGame])

  useEffect(() => {
    if (phase !== 'play') return
    endedRef.current = false
    const id = window.setInterval(() => {
      setRemainMs((r) => Math.max(0, r - 100))
    }, 100)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'play' || remainMs > 0) return
    if (endedRef.current) return
    endedRef.current = true
    const apm = correctCount
    const prevBest = speedBestApm
    recordSpeedBest(apm)
    /* Timer hit zero — transition to summary (intentional effect) */
    // eslint-disable-next-line react-hooks/set-state-in-effect -- end-of-round transition
    setPhase('done')
    if (apm > prevBest) {
      setParty(true)
      window.setTimeout(() => setParty(false), 1600)
    }
  }, [phase, remainMs, correctCount, recordSpeedBest, speedBestApm])

  function start() {
    setRoundBaselineBest(speedBestApm)
    setRemainMs(ROUND_SEC * 1000)
    setCorrectCount(0)
    setStreak(0)
    slotRef.current = 0
    endedRef.current = false
    setPhase('play')
    pushQuestion()
  }

  function pick(n: number) {
    if (phase !== 'play' || remainMs <= 0 || !game) return
    const ok = n === correctAnswerFor(game)
    const ms = Math.round(responseClockMs() - questionShownAt.current)
    recordAnswer({
      gameId: 'speed',
      question: game.base,
      correct: ok,
      responseMs: ms,
    })
    bumpFrustrationAfterAnswer()
    if (ok) {
      setCorrectCount((c) => c + 1)
      if (expertMode) {
        setStreak((s) => {
          const next = s + 1
          recordExpertComboPeak(next)
          if (next === 3) awardBonusCoins(2)
          if (next === 5) awardBonusCoins(3)
          if (next === 10) awardBonusCoins(5)
          return next
        })
      }
    } else {
      setStreak(0)
    }
    pushQuestion()
  }

  const prompt = game ? formatQuestionPrompt(game) : ''

  const displayBest = Math.max(speedBestApm, phase === 'done' ? correctCount : 0)

  const tierKey = getDifficultyTierKey({ advancedMode, expertMode, difficultyScale })
  const difficultyBadge = (
    <span className="rounded-full bg-black/5 px-2 py-1">{t(`common:difficulty.${tierKey}`)}</span>
  )
  const comboMult =
    expertMode && streak >= 10
      ? 5
      : expertMode && streak >= 5
        ? 3
        : expertMode && streak >= 3
          ? 2
          : expertMode && streak > 0
            ? 1
            : 0

  return (
    <MainLayout title={t('games:speed.title')} showBackTo="/games" headerRight={difficultyBadge}>
      <Celebration show={party} />
      <div className="text-sm text-[var(--muted)]">{t('games:speed.subtitle')}</div>
      {phase === 'play' && shouldSuggestBreak ? (
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
      {phase === 'play' && flowRecovery === 'switch_mode' ? (
        <div className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-center text-sm text-[var(--muted)]">
          {t('games:flow.recoverySwitch')}{' '}
          <Link to="/games/mixed" className="font-extrabold text-[var(--primary-dark)] underline">
            {t('games:flow.tryMixed')}
          </Link>
        </div>
      ) : null}
      {phase === 'play' && flowRecovery === 'short_challenge' ? (
        <div className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-center text-sm text-[var(--muted)]">
          {t('games:flow.recoveryShort')}
        </div>
      ) : null}

      {phase === 'ready' ? (
        <Card className="mt-4">
          <div className="text-center text-lg font-extrabold">{t('games:speed.rules')}</div>
          <div className="mt-2 text-center text-sm text-[var(--muted)]">
            {t('games:speed.best', { n: speedBestApm })}
          </div>
          <div className="mt-4">
            <BigButton variant="primary" onClick={start}>
              {t('games:speed.start')}
            </BigButton>
          </div>
        </Card>
      ) : null}

      {phase === 'play' && game ? (
        <Card className="mt-4">
          <div className="flex items-center justify-between text-sm font-extrabold">
            <span className="text-[var(--muted)]">{t('games:speed.time')}</span>
            <span>{(remainMs / 1000).toFixed(1)}s</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm font-extrabold">
            <span className="text-[var(--muted)]">{t('games:speed.score')}</span>
            <span>{correctCount}</span>
          </div>
          {expertMode && comboMult >= 1 ? (
            <div className="mt-2 text-center text-sm font-extrabold text-[var(--primary-dark)]">
              {t('games:expert.combo', { n: comboMult })}
            </div>
          ) : null}
          <div className="mt-4 text-center text-4xl font-extrabold tabular-nums">{prompt}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {choices.map((n) => (
              <BigButton
                key={`${questionKey}-${n}`}
                variant="primary"
                onClick={() => {
                  pick(n)
                }}
              >
                {new Intl.NumberFormat(locale).format(n)}
              </BigButton>
            ))}
          </div>
        </Card>
      ) : null}

      {phase === 'done' ? (
        <Card className="mt-4">
          <div className="text-center text-lg font-extrabold">{t('games:speed.complete')}</div>
          <div className="mt-2 text-center text-3xl font-extrabold tabular-nums">
            {t('games:speed.apm', { n: correctCount })}
          </div>
          {correctCount > roundBaselineBest ? (
            <div className="mt-2 text-center text-sm font-extrabold text-[var(--success)]">
              {t('games:speed.newRecord')}
            </div>
          ) : (
            <div className="mt-2 text-center text-sm text-[var(--muted)]">
              {t('games:speed.best', { n: displayBest })}
            </div>
          )}
          <div className="mt-4">
            <BigButton
              variant="primary"
              onClick={() => {
                setPhase('ready')
              }}
            >
              {t('games:speed.again')}
            </BigButton>
          </div>
        </Card>
      ) : null}

      <div className="mt-4">
        <BigButton variant="ghost" onClick={() => navigate('/games')}>
          {t('games:shell.exit')}
        </BigButton>
      </div>
    </MainLayout>
  )
}
