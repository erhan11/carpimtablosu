import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function MainLayout({
  title,
  children,
  showBackTo = '/',
}: {
  title?: string
  children: ReactNode
  showBackTo?: string
}) {
  const { t } = useTranslation('common')
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-10 pt-[max(16px,env(safe-area-inset-top))]">
      <header className="mb-4 flex items-center gap-3">
        <Link
          to={showBackTo}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-white/80 px-3 font-extrabold text-[var(--ink)] shadow"
          aria-label={t('accessibility.goBack')}
        >
          ← {t('back')}
        </Link>
        {title ? (
          <h1 className="text-xl font-extrabold text-[var(--primary-dark)]">{title}</h1>
        ) : null}
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
