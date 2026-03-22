import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const QUESTIONS = [
  { a: 2, b: 2, answer: 4, choices: [3, 4, 6, 8] },
  { a: 3, b: 1, answer: 3, choices: [1, 2, 3, 6] },
  { a: 5, b: 2, answer: 10, choices: [5, 7, 10, 12] },
]

const stepVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -24, transition: { duration: 0.2 } },
}

export function LevelCheckStep({ onDone }: { onDone: (correct: number) => void }) {
  const [current, setCurrent] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)

  const question = QUESTIONS[current]!

  const handleAnswer = (choice: number) => {
    if (chosen !== null) return
    const isCorrect = choice === question.answer
    setChosen(choice)
    const newCorrect = isCorrect ? correct + 1 : correct
    if (isCorrect) setCorrect(newCorrect)

    setTimeout(() => {
      setChosen(null)
      const nextIdx = current + 1
      if (nextIdx >= QUESTIONS.length) {
        onDone(newCorrect)
      } else {
        setCurrent(nextIdx)
      }
    }, 600)
  }

  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-1 flex-col items-center justify-center gap-8"
    >
      <div className="text-center">
        <p className="text-xl font-extrabold text-[var(--muted)]">Mini oyun 🎮</p>
        <p className="mt-1 text-sm font-bold text-[var(--muted)]">
          {current + 1} / {QUESTIONS.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
          className="flex flex-col items-center gap-6 w-full"
        >
          <div className="rounded-3xl bg-white/90 px-10 py-8 shadow-[var(--shadow)] text-center">
            <span className="text-6xl font-extrabold text-[var(--ink)]">
              {question.a} × {question.b} = ?
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            {question.choices.map((choice) => {
              const isChosen = chosen === choice
              const isCorrect = choice === question.answer
              let bg = 'bg-white/90 border-2 border-[#e6edf7] text-[var(--ink)]'
              if (isChosen && isCorrect) bg = 'bg-[var(--success)] text-white border-2 border-[var(--success)]'
              if (isChosen && !isCorrect) bg = 'bg-[var(--danger-soft)] text-white border-2 border-[var(--danger-soft)]'
              if (!isChosen && chosen !== null && isCorrect)
                bg = 'bg-[var(--success)] text-white border-2 border-[var(--success)]'

              return (
                <motion.button
                  key={choice}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAnswer(choice)}
                  disabled={chosen !== null}
                  className={`min-h-[72px] rounded-2xl text-3xl font-extrabold transition ${bg}`}
                >
                  {choice}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
