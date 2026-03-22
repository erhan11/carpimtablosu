import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { formatDayForLocale, getLocalDay } from '@/lib/date/localDay'
import { formatNumber, formatPercent } from '@/lib/format'
import { rollLast7Days, useProgressStore } from '@/lib/progress/store'

const BADGES: { id: string; key: string }[] = [
  { id: 'streak3', key: 'streak3' },
  { id: 'streak7', key: 'streak7' },
  { id: 'coins50', key: 'coins50' },
  { id: 'tables4', key: 'tables4' },
  { id: 'facts30', key: 'facts30' },
]

export function ParentPanel() {
  const renderCountRef = useRef(0)
  renderCountRef.current += 1
  // #region agent log
  if (renderCountRef.current <= 10) {
    fetch('http://127.0.0.1:7270/ingest/eb6efa66-208f-401b-a382-118f7c3aaa35', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '39b93c' },
      body: JSON.stringify({
        sessionId: '39b93c',
        runId: 'post-fix',
        hypothesisId: 'H-zustand-array',
        location: 'ParentPanel.tsx:render',
        message: 'ParentPanel render',
        data: { renderCount: renderCountRef.current },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }
  // #endregion
  const { t, i18n } = useTranslation(['parent', 'home'])
  const mastered = useProgressStore((s) => s.masteredFacts.length)
  const weak = useProgressStore((s) => s.weakFacts)
  const last7Raw = useProgressStore((s) => s.last7DaysRaw)
  const earned = useProgressStore((s) => s.earnedBadges)

  const last7 = useMemo(() => rollLast7Days(last7Raw), [last7Raw])

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const totals = useMemo(() => {
    const today = getLocalDay()
    const todayRow = last7Raw.find((d) => d.date === today)
    const minutesToday = todayRow?.minutes ?? 0
    const correct = last7Raw.reduce((a, d) => a + d.correct, 0)
    const wrong = last7Raw.reduce((a, d) => a + d.wrong, 0)
    const rate = correct + wrong === 0 ? 0 : correct / (correct + wrong)
    return { minutesToday, correct, wrong, rate }
  }, [last7Raw])

  const weakLabel =
    weak.length === 0
      ? t('parent:empty')
      : weak
          .slice(0, 8)
          .map((w) => w.key)
          .join(', ')

  return (
    <MainLayout title={t('parent:title')} showBackTo="/">
      <div className="text-sm text-[var(--muted)]">{t('parent:intro')}</div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <Card>
          <div className="text-sm font-extrabold text-[var(--muted)]">{t('parent:stats.learned')}</div>
          <div className="mt-1 text-3xl font-extrabold">{formatNumber(mastered, locale)}</div>
        </Card>
        <Card>
          <div className="text-sm font-extrabold text-[var(--muted)]">{t('parent:stats.weak')}</div>
          <div className="mt-1 text-sm font-bold">{t('parent:weakList', { list: weakLabel })}</div>
        </Card>
        <Card>
          <div className="text-sm font-extrabold text-[var(--muted)]">{t('parent:stats.minutes')}</div>
          <div className="mt-1 text-3xl font-extrabold">{formatNumber(totals.minutesToday, locale)}</div>
        </Card>
        <Card>
          <div className="text-sm font-extrabold text-[var(--muted)]">{t('parent:stats.ratio')}</div>
          <div className="mt-1 text-lg font-extrabold">
            {formatNumber(totals.correct, locale)} / {formatNumber(totals.wrong, locale)}
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">
            {t('parent:stats.accuracy', { rate: formatPercent(totals.rate, locale) })}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="text-lg font-extrabold">{t('parent:chart.title')}</div>
        <div className="mt-3 flex items-end gap-2">
          {(() => {
            const maxM = Math.max(1, ...last7.map((x) => x.minutes))
            return last7.map((d) => {
              const h = Math.round((d.minutes / maxM) * 96)
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-xl bg-[var(--primary)]/70"
                    style={{ height: `${Math.max(8, h)}px` }}
                  />
                  <div className="text-[10px] font-bold text-[var(--muted)]">
                    {formatDayForLocale(d.date, locale)}
                  </div>
                </div>
              )
            })
          })()}
        </div>
        <div className="mt-2 text-xs text-[var(--muted)]">{t('parent:chart.minutes')}</div>
      </Card>

      <Card className="mt-4">
        <div className="text-lg font-extrabold">{t('parent:tips.title')}</div>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>{t('parent:tips.a')}</li>
          <li>{t('parent:tips.b')}</li>
          <li>{t('parent:tips.c')}</li>
        </ul>
      </Card>

      <Card className="mt-4">
        <div className="text-lg font-extrabold">{t('home:badges.title')}</div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {BADGES.map((b) => {
            const on = earned.includes(b.id)
            return (
              <div
                key={b.id}
                className={`rounded-2xl border-2 px-3 py-2 text-sm font-extrabold ${
                  on ? 'border-[var(--success)] bg-[#e9fffb]' : 'border-[#e6edf7] bg-white'
                }`}
              >
                {on ? '✅ ' : '🔒 '}
                {t(`home:badges.${b.key}`)}
              </div>
            )
          })}
        </div>
      </Card>
    </MainLayout>
  )
}
