import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { useProgressStore } from '@/lib/progress/store'

const BADGES: { id: string; key: string }[] = [
  { id: 'streak3', key: 'streak3' },
  { id: 'streak7', key: 'streak7' },
  { id: 'coins50', key: 'coins50' },
  { id: 'tables4', key: 'tables4' },
  { id: 'facts30', key: 'facts30' },
]

export function BadgesScreen() {
  const { t } = useTranslation('home')
  const earned = useProgressStore((s) => s.earnedBadges)

  return (
    <MainLayout title={t('badges.title')} showBackTo="/">
      <div className="grid grid-cols-1 gap-3">
        {BADGES.map((b) => {
          const on = earned.includes(b.id)
          return (
            <Card key={b.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold">{t(`badges.${b.key}`)}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {on ? '✅' : t('badges.locked')}
                  </div>
                </div>
                <div className="text-4xl">{on ? '🏅' : '🎁'}</div>
              </div>
            </Card>
          )
        })}
      </div>
    </MainLayout>
  )
}
