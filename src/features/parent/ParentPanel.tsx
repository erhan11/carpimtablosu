import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { formatDayForLocale, getLocalDay } from '@/lib/date/localDay'
import { formatFactDisplay } from '@/lib/adaptive/adaptive'
import { getEffectiveProgramStart, getPlanWeekRow } from '@/lib/plan/programWeek'
import { useProgressStore } from '@/lib/progress/store'

const BAR_MAX_PX = 40
const BAR_MIN_PX = 4

function rollLast7PracticeCounts(
  practiceByDay: { date: string; factKeys: string[] }[],
): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const dt = new Date()
    dt.setHours(0, 0, 0, 0)
    dt.setDate(dt.getDate() - i)
    const key = getLocalDay(dt)
    const found = practiceByDay.find((d) => d.date === key)
    const fk = found?.factKeys
    const count = Array.isArray(fk) ? fk.length : 0
    out.push({ date: key, count })
  }
  return out
}

export function ParentPanel() {
  const { t, i18n } = useTranslation(['parent', 'learn'])
  const weakFacts = useProgressStore((s) => s.weakFacts ?? [])
  const practiceByDay = useProgressStore((s) => s.practiceByDay ?? [])
  const streak = useProgressStore((s) => s.streak)
  const programStartDate = useProgressStore((s) => s.programStartDate)

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'

  const topDifficult = useMemo(() => weakFacts.slice(0, 5), [weakFacts])

  const last7 = useMemo(() => rollLast7PracticeCounts(practiceByDay), [practiceByDay])

  const maxCount = useMemo(() => Math.max(1, ...last7.map((d) => d.count)), [last7])

  const weekFocusText = useMemo(() => {
    const effectiveStart = getEffectiveProgramStart(programStartDate)
    const row = getPlanWeekRow(effectiveStart, getLocalDay())
    const tables = row.tables
    if (tables.length === 0) return '—'
    const lf = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' })
    return lf.format(tables.map((n) => t('learn:tableLabel', { n })))
  }, [locale, programStartDate, t])

  const streakCount = streak?.current ?? 0

  const weekdayLongFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long' }),
    [locale],
  )

  return (
    <MainLayout title={t('parent:title')} showBackTo="/">
      <div className="flex flex-col gap-4">
        <Card>
          <div className="text-sm font-extrabold text-[var(--muted)]">{t('parent:topDifficultFacts')}</div>
          {topDifficult.length === 0 ? (
            <div className="mt-2 text-sm text-[var(--muted)]">{t('parent:noDifficultFacts')}</div>
          ) : (
            <ul className="mt-2 space-y-1.5 text-lg font-extrabold">
              {topDifficult.map((w) => (
                <li key={w.key}>{formatFactDisplay(w.key, locale)}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="text-sm font-extrabold text-[var(--muted)]">{t('parent:last7Days')}</div>
          <div className="mt-3 flex gap-2">
            {last7.map((d) => {
              const c = d.count
              const h =
                c === 0
                  ? 0
                  : Math.round(BAR_MIN_PX + (c / maxCount) * (BAR_MAX_PX - BAR_MIN_PX))
              const [y, mo, da] = d.date.split('-').map(Number)
              const dayDate = new Date(y, mo - 1, da)
              const weekday = Number.isNaN(dayDate.getTime())
                ? d.date
                : weekdayLongFmt.format(dayDate)
              return (
                <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div
                    className="flex w-full items-end justify-center"
                    style={{ height: BAR_MAX_PX }}
                  >
                    <div
                      className="w-full rounded-lg bg-[var(--primary)]"
                      style={{ height: `${h}px` }}
                      role="img"
                      aria-label={t('parent:activity', { weekday, count: c })}
                    />
                  </div>
                  <div className="truncate text-center text-[10px] font-bold text-[var(--muted)]">
                    {formatDayForLocale(d.date, locale)}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-extrabold text-[var(--muted)]">{t('parent:currentStreak')}</div>
          {streakCount === 0 ? (
            <div className="mt-2 text-lg font-extrabold">{t('parent:startStreak')}</div>
          ) : (
            <div className="mt-2 text-lg font-extrabold">{t('parent:days', { count: streakCount })}</div>
          )}
        </Card>

        <Card>
          <div className="text-sm font-extrabold text-[var(--muted)]">{t('parent:thisWeekFocus')}</div>
          <div className="mt-2 text-base font-extrabold leading-snug">{weekFocusText}</div>
        </Card>
      </div>
    </MainLayout>
  )
}
