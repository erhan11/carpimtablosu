import { DEFAULT_THEME_ID, THEMES } from '@/content/cosmetics/themes'

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

/** Darken hex for --primary-dark and button shadow. */
function darkenHex(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#3d7fd4'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const f = 1 - clamp01(amount)
  const r2 = Math.round(r * f)
  const g2 = Math.round(g * f)
  const b2 = Math.round(b * f)
  return `#${[r2, g2, b2].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

export function resolveThemeId(themeId: string | undefined): string {
  if (themeId && THEMES.some((t) => t.id === themeId)) return themeId
  return DEFAULT_THEME_ID
}

/** Apply theme colors to :root (--primary, --primary-dark). */
export function applyThemeById(themeId: string | undefined) {
  const id = resolveThemeId(themeId)
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0]!
  const hex = theme.color
  const root = document.documentElement
  root.style.setProperty('--primary', hex)
  root.style.setProperty('--primary-dark', darkenHex(hex, 0.15))
  root.style.setProperty('--primary-shadow', darkenHex(hex, 0.22))
}
