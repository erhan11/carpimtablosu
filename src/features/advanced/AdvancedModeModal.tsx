import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type Props = {
  kind: 'advanced' | 'skip'
  onConfirm: () => void
  onDismiss: () => void
}

export function AdvancedModeModal({ kind, onConfirm, onDismiss }: Props) {
  const { t } = useTranslation('home')
  const title = kind === 'advanced' ? t('advanced.offerTitle') : t('advanced.skipTitle')
  const body = kind === 'advanced' ? t('advanced.offerBody') : t('advanced.skipBody')
  const confirm = kind === 'advanced' ? t('advanced.yes') : t('advanced.skipConfirm')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-8 pt-16 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="adv-modal-title"
    >
      <Card className="max-w-md shadow-2xl">
        <div id="adv-modal-title" className="text-lg font-extrabold text-[var(--primary-dark)]">
          {title}
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
        <div className="mt-4 flex flex-col gap-2">
          <BigButton variant="primary" onClick={onConfirm}>
            {confirm}
          </BigButton>
          <BigButton variant="ghost" onClick={onDismiss}>
            {t('advanced.notNow')}
          </BigButton>
        </div>
      </Card>
    </div>
  )
}
