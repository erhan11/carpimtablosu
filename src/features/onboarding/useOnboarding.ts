import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgressStore } from '@/lib/progress/store'

export function useOnboarding() {
  const navigate = useNavigate()
  const step = useProgressStore((s) => s.onboardingStep)
  const setOnboardingStep = useProgressStore((s) => s.setOnboardingStep)
  const completeOnboarding = useProgressStore((s) => s.completeOnboarding)
  const soundEnabled = useProgressStore((s) => s.soundEnabled)
  const setSoundEnabled = useProgressStore((s) => s.setSoundEnabled)

  const [correctCount, setCorrectCount] = useState(0)
  const [difficulty, setDifficulty] = useState<'normal' | 'hard'>('normal')

  const advance = useCallback(() => {
    setOnboardingStep(step + 1)
  }, [setOnboardingStep, step])

  const handleLevelCheckDone = useCallback(
    (count: number) => {
      setCorrectCount(count)
      setOnboardingStep(2)
    },
    [setOnboardingStep],
  )

  const handlePlay = useCallback(() => {
    let level = 1
    let tables = [1]
    try {
      if (correctCount >= 3) {
        level = 2
        tables = [2, 3, 4, 5]
      } else if (correctCount >= 2) {
        level = 1
        tables = [1, 2, 3]
      }
      completeOnboarding({ level, tables, difficulty })
    } catch {
      completeOnboarding({ level: 1, tables: [1], difficulty: 'normal' })
    }
    navigate('/learn', { replace: true })
  }, [correctCount, difficulty, completeOnboarding, navigate])

  return {
    step,
    advance,
    handleLevelCheckDone,
    handlePlay,
    soundEnabled,
    setSoundEnabled,
    difficulty,
    setDifficulty,
  }
}
