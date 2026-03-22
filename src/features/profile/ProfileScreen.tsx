import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { MainLayout } from '@/layouts/MainLayout'
import { AVATARS } from '@/content/cosmetics/avatars'
import { STICKERS } from '@/content/cosmetics/stickers'
import { THEMES } from '@/content/cosmetics/themes'
import { formatNumber } from '@/lib/format'
import { normalizeCosmetics } from '@/lib/cosmetics/normalize'
import { useProgressStore } from '@/lib/progress/store'

export function ProfileScreen() {
  const { t, i18n } = useTranslation(['profile', 'common'])
  const coins = useProgressStore((s) => s.coins)
  const level = useProgressStore((s) => s.level)
  const cosmeticsRaw = useProgressStore((s) => s.cosmetics)
  const cosmetics = useMemo(() => normalizeCosmetics(cosmeticsRaw), [cosmeticsRaw])
  const selectAvatar = useProgressStore((s) => s.selectAvatar)
  const setThemeId = useProgressStore((s) => s.setThemeId)

  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US'
  const unlocked = new Set(cosmetics.unlockedAvatarIds)

  return (
    <MainLayout title={t('profile:title')} showBackTo="/">
      <div className="mb-4 rounded-2xl bg-white/80 px-4 py-3 text-center text-lg font-extrabold shadow">
        🪙 {t('profile:coins')}: {formatNumber(coins, locale)}
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-extrabold text-[var(--primary-dark)]">
          {t('profile:avatar.title')}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {AVATARS.map((a) => {
            const isSel = cosmetics.avatarId === a.id
            const canUse = a.cost === 0 || unlocked.has(a.id)
            const canBuy = !canUse && a.cost > 0 && coins >= a.cost
            const disabled = !canUse && !canBuy
            return (
              <button
                key={a.id}
                type="button"
                disabled={disabled}
                onClick={() => selectAvatar(a.id)}
                aria-label={`${t('profile:avatar.title')}: ${a.id}`}
                className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-3xl shadow transition active:scale-[0.98] ${
                  isSel
                    ? 'border-[var(--primary)] bg-[var(--primary)]/15'
                    : 'border-[#e6edf7] bg-white/90'
                } ${disabled ? 'opacity-45' : ''}`}
              >
                <span>{a.emoji}</span>
                {a.cost > 0 ? (
                  <span className="text-xs font-bold text-[var(--muted)]">
                    {unlocked.has(a.id) ? t('profile:unlock') : `${a.cost} 🪙`}
                  </span>
                ) : null}
                {isSel ? (
                  <span className="text-xs font-extrabold text-[var(--primary-dark)]">
                    {t('profile:selected')}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-extrabold text-[var(--primary-dark)]">
          {t('profile:theme.title')}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((th) => {
            const locked = th.requiresLevel !== undefined && level < th.requiresLevel
            const isSel = cosmetics.themeId === th.id
            return (
              <button
                key={th.id}
                type="button"
                disabled={locked}
                onClick={() => setThemeId(th.id)}
                aria-label={`${t('profile:theme.title')}: ${th.id}`}
                className={`flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 font-extrabold capitalize shadow transition active:scale-[0.98] ${
                  isSel
                    ? 'border-[var(--primary)] bg-white'
                    : 'border-[#e6edf7] bg-white/90'
                } ${locked ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                <span
                  className="h-10 w-10 rounded-full shadow-inner ring-2 ring-white"
                  style={{ background: th.color }}
                />
                {th.id}
                {locked ? <span className="text-lg">🔒</span> : null}
                {isSel ? (
                  <span className="text-xs text-[var(--primary-dark)]">{t('profile:selected')}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-[var(--primary-dark)]">
          {t('profile:stickers.title')}
        </h2>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STICKERS.map((st) => {
              const has = cosmetics.stickersUnlocked.includes(st.id)
              return (
                <div
                  key={st.id}
                  className="relative flex aspect-square items-center justify-center rounded-2xl bg-[#f3f7ff] text-4xl"
                >
                  <span className={has ? '' : 'opacity-40 grayscale'}>{st.emoji}</span>
                  {!has ? (
                    <span
                      className="absolute inset-0 flex items-center justify-center text-2xl"
                      aria-hidden
                    >
                      🔒
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Card>
      </section>
    </MainLayout>
  )
}
