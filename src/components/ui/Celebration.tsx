import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export function Celebration({ show }: { show: boolean }) {
  const { t } = useTranslation('common')
  if (!show) return null
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/15 px-6"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-sm rounded-3xl bg-white px-6 py-5 text-center shadow-2xl">
        <div className="text-5xl">🎉</div>
        <div className="mt-2 text-2xl font-extrabold text-[var(--ink)]">{t('celebration.title')}</div>
        <div className="mt-1 text-sm text-[var(--muted)]">{t('celebration.subtitle')}</div>
      </div>
    </motion.div>
  )
}
