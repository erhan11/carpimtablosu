import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { formatNumber } from '@/lib/format'
import { useProgressStore } from '@/lib/progress/store'

export function ReviewScreen() {
  const { t, i18n } = useTranslation('home')
  const weak = useProgressStore((s) => s.weakFacts)
  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  return (
    <MainLayout title={t('review.title')} showBackTo="/">
      <div className="text-sm text-[var(--muted)]">{t('review.hint')}</div>
      {weak.length === 0 ? (
        <Card className="mt-4">
          <div className="text-center font-extrabold">{t('review.empty')}</div>
        </Card>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {weak.slice(0, 12).map((w) => (
            <Card key={w.key}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold">{w.key.replace('x', ' × ')}</div>
                <div className="text-sm text-[var(--muted)]">
                  {formatNumber(w.mistakes, locale)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </MainLayout>
  )
}
