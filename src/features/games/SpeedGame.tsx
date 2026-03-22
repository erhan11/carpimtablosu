import { useCallback, useEffect, useRef, useState } from 'react'
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

const ROUND_SEC = 60

export function SpeedGame() {
  const { t, i18n } = useTranslation(['games', 'common'])
  const navigate = useNavigate()
  const unlocked = useProgressStore((s) => s.unlockedTableIds)
  const weak = useWeakKeys()
  const recordAnswer = useProgressStore((s) => s.recordAnswer)
  const recordSpeedBest = useProgressStore((s) => s.recordSpeedBest)
  const advancedMode = useProgressStore((s) => s.advancedMode)
  const difficultyScale = useProgressStore((s) => s.difficultyScale ?? 1)
  const speedBestApm = useProgressStore((s) => s.speedBestApm ?? 0)

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const [phase, setPhase] = useState<'ready' | 'play' | 'done'>('ready')
  const [remainMs, setRemainMs] = useState(ROUND_SEC * 1000)
  const [correctCount, setCorrectCount] = useState(0)
  const [game, setGame] = useState<GameQuestion | null>(null)
  const [choices, setChoices] = useState<number[]>([])
  const [party, setParty] = useState(false)
  const questionShownAt = useRef<number>(0)
  const endedRef = useRef(false)
  const [roundBaselineBest, setRoundBaselineBest] = useState(0)
  /** Stable per question — do not tie list keys to `remainMs` (timer ticks remount buttons and can drop clicks). */
  const [questionKey, setQuestionKey] = useState(0)

  const pushQuestion = useCallback(() => {
    const g = pickGameQuestion(unlocked, weak, { advancedMode, difficultyScale })
    setGame(g)
    questionShownAt.current = responseClockMs()
    const ca = correctAnswerFor(g)
    const wrong = wrongAnswersForGame(g, 3)
    setChoices(shuffleInPlace([ca, ...wrong]))
    setQuestionKey((k) => k + 1)
  }, [unlocked, weak, advancedMode, difficultyScale])

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
    if (ok) setCorrectCount((c) => c + 1)
    pushQuestion()
  }

  const prompt = game ? formatQuestionPrompt(game) : ''

  const displayBest = Math.max(speedBestApm, phase === 'done' ? correctCount : 0)

  return (
    <MainLayout title={t('games:speed.title')} showBackTo="/games">
      <Celebration show={party} />
      <div className="text-sm text-[var(--muted)]">{t('games:speed.subtitle')}</div>

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
