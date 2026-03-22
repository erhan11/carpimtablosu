import { motion } from 'framer-motion'
import { BigButton } from '@/components/ui/Button'

const stepVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'backOut' } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
}

const starVariants = {
  animate: {
    rotate: [0, 15, -15, 10, -10, 0],
    scale: [1, 1.2, 1],
    transition: { duration: 0.6, delay: 0.3 },
  },
}

export function ReadyStep({ onPlay }: { onPlay: () => void }) {
  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2 text-5xl">
          <motion.span variants={starVariants} animate="animate">⭐</motion.span>
          <motion.span variants={starVariants} animate="animate" transition={{ delay: 0.15 }}>
            🎉
          </motion.span>
          <motion.span variants={starVariants} animate="animate" transition={{ delay: 0.3 }}>
            ⭐
          </motion.span>
        </div>
        <h1 className="text-4xl font-extrabold text-[var(--ink)]">Harika!</h1>
        <p className="text-2xl font-bold text-[var(--muted)]">Başlayalım 🚀</p>
      </div>

      <div className="rounded-3xl bg-white/90 px-10 py-8 shadow-[var(--shadow)] text-center w-full">
        <p className="text-sm font-extrabold text-[var(--muted)] mb-2">İlk görevin</p>
        <div className="flex items-center justify-center gap-3 text-5xl font-extrabold text-[var(--ink)]">
          <span>2</span>
          <span className="text-[var(--primary)]">×</span>
          <span>?</span>
        </div>
      </div>

      <motion.div className="w-full" whileTap={{ scale: 0.97 }}>
        <BigButton variant="accent" onClick={onPlay} className="text-2xl py-5">
          Oyna 🎮
        </BigButton>
      </motion.div>
    </motion.div>
  )
}
