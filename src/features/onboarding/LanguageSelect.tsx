import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { setAppLocale } from '@/lib/i18n'
import { useProgressStore } from '@/lib/progress/store'

export function LanguageSelect() {
  const { t } = useTranslation('common')
  const complete = useProgressStore((s) => s.completeLanguageSelect)
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-4 px-6 pb-10 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="text-center">
        <div className="text-6xl">🌍</div>
        <h1 className="mt-2 text-3xl font-extrabold">{t('language.title')}</h1>
        <p className="mt-2 text-base text-[var(--muted)]">{t('language.subtitle')}</p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <BigButton
          variant="primary"
          onClick={() => {
            setAppLocale('tr')
            complete('tr')
            navigate('/', { replace: true })
          }}
        >
          {t('language.tr')}
        </BigButton>
        <BigButton
          variant="accent"
          onClick={() => {
            setAppLocale('en')
            complete('en')
            navigate('/', { replace: true })
          }}
        >
          {t('language.en')}
        </BigButton>
      </div>
    </div>
  )
}
