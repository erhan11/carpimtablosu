import { motion } from 'framer-motion'
import { BigButton } from '@/components/ui/Button'

const stepVariants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -24, transition: { duration: 0.2 } },
}

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
        className="text-[96px] leading-none"
      >
        🦊
      </motion.div>

      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-extrabold text-[var(--ink)]">Merhaba! 👋</h1>
        <p className="text-2xl font-bold text-[var(--muted)]">Hadi birlikte oynayalım.</p>
      </div>

      <motion.div
        className="w-full"
        whileTap={{ scale: 0.97 }}
      >
        <BigButton variant="primary" onClick={onNext} className="text-2xl py-5">
          Başla 🚀
        </BigButton>
      </motion.div>
    </motion.div>
  )
}
