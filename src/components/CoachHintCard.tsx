import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { BigButton } from '@/components/ui/Button'
import type { CoachHint } from '@/lib/coach/types'

type Props = {
  hint: CoachHint
  onNextHint: () => void
  onClose: () => void
}

export function CoachHintCard({ hint, onNextHint, onClose }: Props) {
  const { t } = useTranslation('learn')

  return (
    <Card className="mt-3 border border-[var(--primary)]/20 bg-[#f0f7ff]">
      <div className="text-xs font-extrabold text-[var(--muted)]">{hint.title}</div>
      <div className="mt-2 text-base font-bold text-[var(--ink)]">{hint.message}</div>
      <div className="mt-3 flex flex-col gap-2">
        {!hint.revealAnswer && hint.level < 4 && (
          <BigButton variant="ghost" onClick={onNextHint}>
            {hint.level === 3 ? t('coach.showAnswer') : t('coach.nextHint')}
          </BigButton>
        )}
        <BigButton variant="ghost" onClick={onClose} className="text-sm">
          {t('coach.close')}
        </BigButton>
      </div>
    </Card>
  )
}
