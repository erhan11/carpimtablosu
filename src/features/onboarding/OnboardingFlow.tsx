import { AnimatePresence } from 'framer-motion'
import { WelcomeStep } from './WelcomeStep'
import { LevelCheckStep } from './LevelCheckStep'
import { ParentStep } from './ParentStep'
import { ReadyStep } from './ReadyStep'
import { useOnboarding } from './useOnboarding'

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < current
              ? 'w-6 bg-[var(--primary)]'
              : i === current - 1
                ? 'w-8 bg-[var(--primary)]'
                : 'w-4 bg-[#e6edf7]'
          }`}
        />
      ))}
      <span className="ml-2 text-sm font-bold text-[var(--muted)]">
        {current} / {total}
      </span>
    </div>
  )
}

export function OnboardingFlow() {
  const {
    step,
    advance,
    handleLevelCheckDone,
    handlePlay,
    soundEnabled,
    setSoundEnabled,
    difficulty,
    setDifficulty,
  } = useOnboarding()

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-10 pt-[max(16px,env(safe-area-inset-top))]">
      <StepIndicator current={step + 1} total={4} />

      <AnimatePresence mode="wait">
        {step === 0 && <WelcomeStep key="welcome" onNext={advance} />}
        {step === 1 && <LevelCheckStep key="level" onDone={handleLevelCheckDone} />}
        {step === 2 && (
          <ParentStep
            key="parent"
            soundEnabled={soundEnabled}
            onSoundChange={setSoundEnabled}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            onNext={advance}
          />
        )}
        {step === 3 && <ReadyStep key="ready" onPlay={handlePlay} />}
      </AnimatePresence>
    </div>
  )
}
