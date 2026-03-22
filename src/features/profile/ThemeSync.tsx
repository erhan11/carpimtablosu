import { useEffect } from 'react'
import { applyThemeById } from '@/lib/cosmetics/applyTheme'
import { useProgressStore } from '@/lib/progress/store'

/** Applies persisted theme to CSS variables on load and when theme changes. */
export function ThemeSync() {
  const themeId = useProgressStore((s) => s.cosmetics.themeId)
  useEffect(() => {
    applyThemeById(themeId)
  }, [themeId])
  return null
}
