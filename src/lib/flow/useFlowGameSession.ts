import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildFlowPickForNextQuestion,
  detectFrustration,
  suggestBreak,
  updateFlowMetrics,
} from '@/lib/flow/flowEngine'
import { factKeyFromGame, type GameQuestion } from '@/lib/math/advancedQuestions'
import { useProgressStore } from '@/lib/progress/store'

/** Session-local refs for flow picks + break suggestion (games using GameQuestion). */
export function useFlowGameSession() {
  const standardStreakRef = useRef(0)
  const prevVariantRef = useRef<string | null>(null)
  const lastFactKeysRef = useRef<string[]>([])
  const frustrationSessionRef = useRef(0)
  const sessionStartRef = useRef(0)
  const [breakDismissed, setBreakDismissed] = useState(false)
  const [shouldSuggestBreak, setShouldSuggestBreak] = useState(false)

  useEffect(() => {
    sessionStartRef.current = Date.now()
    queueMicrotask(() => {
      setBreakDismissed(false)
    })
  }, [])

  useEffect(() => {
    if (breakDismissed) {
      queueMicrotask(() => {
        setShouldSuggestBreak(false)
      })
      return
    }
    const tick = () => {
      const start = sessionStartRef.current
      if (start === 0) return
      setShouldSuggestBreak(suggestBreak(Date.now() - start).shouldSuggest)
    }
    const id = window.setInterval(tick, 30_000)
    tick()
    return () => window.clearInterval(id)
  }, [breakDismissed])

  const syncStreakFromGame = useCallback((game: GameQuestion) => {
    const fk = factKeyFromGame(game)
    lastFactKeysRef.current = [...lastFactKeysRef.current, fk].slice(-5)
    if (game.variant === 'standard' || game.variant === 'twodigit') {
      standardStreakRef.current =
        prevVariantRef.current === 'standard' || prevVariantRef.current === 'twodigit'
          ? standardStreakRef.current + 1
          : 1
    } else {
      standardStreakRef.current = 0
    }
    prevVariantRef.current = game.variant
  }, [])

  const bumpFrustrationAfterAnswer = useCallback(() => {
    const buf = useProgressStore.getState().performanceBuffer ?? []
    const m = updateFlowMetrics(buf)
    if (detectFrustration(m)) {
      frustrationSessionRef.current += 1
    } else {
      frustrationSessionRef.current = 0
    }
  }, [])

  const pickIntent = useCallback((slotIndex: number, mixedOnly?: boolean) => {
    const s = useProgressStore.getState()
    return buildFlowPickForNextQuestion({
      slotIndex,
      performanceBuffer: s.performanceBuffer ?? [],
      programStartDate: s.programStartDate,
      unlockedTableIds: s.unlockedTableIds,
      weakKeys: s.weakFacts.map((w) => w.key),
      difficultyScale: s.difficultyScale ?? 1,
      advancedMode: s.advancedMode,
      expertMode: s.expertMode,
      mixedOnly,
      recentStandardStreak: standardStreakRef.current,
      avoidFactKeys: lastFactKeysRef.current,
      consecutiveFrustrationSignals: frustrationSessionRef.current,
    })
  }, [])

  return {
    pickIntent,
    syncStreakFromGame,
    bumpFrustrationAfterAnswer,
    shouldSuggestBreak,
    breakDismissed,
    setBreakDismissed,
  }
}
