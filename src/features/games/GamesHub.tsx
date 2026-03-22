import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'

const modes = [
  { to: '/games/balloon', key: 'balloon', emoji: '🎈' },
  { to: '/games/match', key: 'match', emoji: '🧩' },
  { to: '/games/memory', key: 'memory', emoji: '🃏' },
  { to: '/games/sprint', key: 'sprint', emoji: '⚡' },
  { to: '/games/boss', key: 'boss', emoji: '🐉' },
] as const

export function GamesHub() {
  const { t } = useTranslation('games')
  return (
    <MainLayout title={t('hub.title')} showBackTo="/">
      <div className="text-sm text-[var(--muted)]">{t('hub.subtitle')}</div>
      <div className="mt-4 grid grid-cols-1 gap-3">
        {modes.map((m) => (
          <Link key={m.to} to={m.to}>
            <Card className="active:scale-[0.99]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold">{t(`modes.${m.key}`)}</div>
                  <div className="text-sm text-[var(--muted)]">{t(`${m.key}.title`)}</div>
                </div>
                <div className="text-4xl">{m.emoji}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </MainLayout>
  )
}
