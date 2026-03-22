import { useTranslation } from 'react-i18next'
import { BigButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { setAppLocale } from '@/lib/i18n'
import { useProgressStore } from '@/lib/progress/store'

export function SettingsScreen() {
  const { t } = useTranslation('settings')
  const locale = useProgressStore((s) => s.locale)
  const setLocale = useProgressStore((s) => s.setLocale)
  const soundEnabled = useProgressStore((s) => s.soundEnabled !== false)
  const setSoundEnabled = useProgressStore((s) => s.setSoundEnabled)
  const reset = useProgressStore((s) => s.resetProgress)
  const advancedMode = useProgressStore((s) => s.advancedMode)
  const setAdvancedMode = useProgressStore((s) => s.setAdvancedMode)
  const expertMode = useProgressStore((s) => s.expertMode)
  const setExpertMode = useProgressStore((s) => s.setExpertMode)
  const expertTimerEnabled = useProgressStore((s) => s.expertTimerEnabled !== false)
  const setExpertTimerEnabled = useProgressStore((s) => s.setExpertTimerEnabled)

  return (
    <MainLayout title={t('title')}>
      <div className="flex flex-col gap-4">
        <Card>
          <div className="text-sm font-bold text-[var(--muted)]">{t('sound')}</div>
          <div className="mt-3">
            <BigButton
              variant={soundEnabled ? 'primary' : 'ghost'}
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-pressed={soundEnabled}
            >
              {soundEnabled ? t('soundOn') : t('soundOff')}
            </BigButton>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-bold text-[var(--muted)]">{t('advanced')}</div>
          <p className="mt-2 text-sm text-[var(--muted)]">{t('advancedHint')}</p>
          <div className="mt-3">
            <BigButton
              variant={advancedMode ? 'primary' : 'ghost'}
              onClick={() => setAdvancedMode(!advancedMode)}
              aria-pressed={advancedMode}
            >
              {advancedMode ? t('advancedOn') : t('advancedOff')}
            </BigButton>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-bold text-[var(--muted)]">{t('expert')}</div>
          <p className="mt-2 text-sm text-[var(--muted)]">{t('expertHint')}</p>
          <div className="mt-3">
            <BigButton
              variant={expertMode ? 'primary' : 'ghost'}
              onClick={() => setExpertMode(!expertMode)}
              aria-pressed={expertMode}
            >
              {expertMode ? t('expertOn') : t('expertOff')}
            </BigButton>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-bold text-[var(--muted)]">{t('expertTimer')}</div>
          <p className="mt-2 text-sm text-[var(--muted)]">{t('expertTimerHint')}</p>
          <div className="mt-3">
            <BigButton
              variant={expertTimerEnabled ? 'primary' : 'ghost'}
              onClick={() => setExpertTimerEnabled(!expertTimerEnabled)}
              aria-pressed={expertTimerEnabled}
              disabled={!expertMode}
            >
              {expertTimerEnabled ? t('expertTimerOn') : t('expertTimerOff')}
            </BigButton>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-bold text-[var(--muted)]">{t('language')}</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <BigButton
              variant={locale === 'tr' ? 'primary' : 'ghost'}
              onClick={() => {
                setLocale('tr')
                setAppLocale('tr')
              }}
            >
              Türkçe
            </BigButton>
            <BigButton
              variant={locale === 'en' ? 'primary' : 'ghost'}
              onClick={() => {
                setLocale('en')
                setAppLocale('en')
              }}
            >
              English
            </BigButton>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-bold text-[var(--muted)]">{t('reset')}</div>
          <p className="mt-2 text-sm text-[var(--muted)]">{t('resetConfirm')}</p>
          <div className="mt-3">
            <BigButton
              variant="ghost"
              onClick={() => {
                if (window.confirm(t('resetConfirm'))) {
                  reset()
                }
              }}
            >
              {t('reset')}
            </BigButton>
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}
