import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { useProgressStore } from '@/lib/progress/store'

const BADGES: { id: string; key: string; emoji: string }[] = [
  { id: 'streak3', key: 'streak3', emoji: '🔥' },
  { id: 'streak7', key: 'streak7', emoji: '🔥' },
  { id: 'coins50', key: 'coins50', emoji: '🪙' },
  { id: 'tables4', key: 'tables4', emoji: '🧮' },
  { id: 'facts30', key: 'facts30', emoji: '✨' },
  { id: 'advanced', key: 'advanced', emoji: '⚡' },
  { id: 'speedDemon', key: 'speedDemon', emoji: '⚡' },
  { id: 'crownTables', key: 'crownTables', emoji: '👑' },
  { id: 'expertLightning', key: 'expertLightning', emoji: '⚡' },
  { id: 'expertChampion', key: 'expertChampion', emoji: '🏆' },
  { id: 'expertMaster', key: 'expertMaster', emoji: '🥇' },
  { id: 'expertLegend', key: 'expertLegend', emoji: '👑' },
]

export function BadgesScreen() {
  const { t } = useTranslation('home')
  const earned = useProgressStore((s) => s.earnedBadges)

  return (
    <MainLayout title={t('badges.title')} showBackTo="/">
      <div className="grid grid-cols-1 gap-3">
        {BADGES.map((badge) => {
          const on = earned.includes(badge.id)
          return (
            <Card key={badge.id}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold">{t(`badges.${badge.key}`)}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {on ? '✅' : t('badges.locked')}
                  </div>
                </div>
                <div className="text-4xl">{on ? badge.emoji : '🎁'}</div>
              </div>
            </Card>
          )
        })}
      </div>
    </MainLayout>
  )
}
