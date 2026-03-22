/** Local calendar day as YYYY-MM-DD (for streaks / daily quests). */
export function getLocalDay(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDayForLocale(isoDay: string, locale: string): string {
  const [y, mo, da] = isoDay.split('-').map(Number)
  const dt = new Date(y, mo - 1, da)
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(dt)
}
