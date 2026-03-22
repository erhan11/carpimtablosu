import { motion } from 'framer-motion'
import { BigButton } from '@/components/ui/Button'

const stepVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -24, transition: { duration: 0.2 } },
}

interface ParentStepProps {
  soundEnabled: boolean
  onSoundChange: (value: boolean) => void
  difficulty: 'normal' | 'hard'
  onDifficultyChange: (value: 'normal' | 'hard') => void
  onNext: () => void
}

export function ParentStep({
  soundEnabled,
  onSoundChange,
  difficulty,
  onDifficultyChange,
  onNext,
}: ParentStepProps) {
  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-1 flex-col justify-center gap-8"
    >
      <div className="text-center">
        <div className="text-5xl">👨‍👩‍👧</div>
        <h2 className="mt-2 text-2xl font-extrabold text-[var(--ink)]">Ebeveyn ayarı</h2>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-white/90 p-6 shadow-[var(--shadow)]">
        {/* Sound toggle */}
        <div className="flex flex-col gap-2">
          <p className="text-base font-extrabold text-[var(--muted)]">Ses</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onSoundChange(false)}
              className={`min-h-[56px] rounded-2xl text-lg font-extrabold transition ${
                !soundEnabled
                  ? 'bg-[var(--primary)] text-white shadow-[0_6px_0_var(--primary-shadow)]'
                  : 'bg-white border-2 border-[#e6edf7] text-[var(--muted)]'
              }`}
            >
              🔇 Kapalı
            </button>
            <button
              onClick={() => onSoundChange(true)}
              className={`min-h-[56px] rounded-2xl text-lg font-extrabold transition ${
                soundEnabled
                  ? 'bg-[var(--primary)] text-white shadow-[0_6px_0_var(--primary-shadow)]'
                  : 'bg-white border-2 border-[#e6edf7] text-[var(--muted)]'
              }`}
            >
              🔊 Açık
            </button>
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-2">
          <p className="text-base font-extrabold text-[var(--muted)]">Zorluk</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onDifficultyChange('normal')}
              className={`min-h-[56px] rounded-2xl text-lg font-extrabold transition ${
                difficulty === 'normal'
                  ? 'bg-[var(--accent)] text-[#3a2f00] shadow-[0_6px_0_#d18b00]'
                  : 'bg-white border-2 border-[#e6edf7] text-[var(--muted)]'
              }`}
            >
              😊 Normal
            </button>
            <button
              onClick={() => onDifficultyChange('hard')}
              className={`min-h-[56px] rounded-2xl text-lg font-extrabold transition ${
                difficulty === 'hard'
                  ? 'bg-[var(--accent)] text-[#3a2f00] shadow-[0_6px_0_#d18b00]'
                  : 'bg-white border-2 border-[#e6edf7] text-[var(--muted)]'
              }`}
            >
              🔥 Zor
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <motion.div whileTap={{ scale: 0.97 }}>
          <BigButton variant="primary" onClick={onNext} className="text-xl py-4">
            Devam ✅
          </BigButton>
        </motion.div>
        <button
          onClick={onNext}
          className="py-3 text-base font-bold text-[var(--muted)] underline underline-offset-2"
        >
          Kendim devam ediyorum
        </button>
      </div>
    </motion.div>
  )
}
