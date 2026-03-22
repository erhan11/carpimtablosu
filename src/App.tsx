import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { BadgesScreen } from '@/features/badges/BadgesScreen'
import { BalloonGame } from '@/features/games/BalloonGame'
import { BossGame } from '@/features/games/BossGame'
import { GamesHub } from '@/features/games/GamesHub'
import { MatchGame } from '@/features/games/MatchGame'
import { MemoryGame } from '@/features/games/MemoryGame'
import { SprintGame } from '@/features/games/SprintGame'
import { HomeScreen } from '@/features/home/HomeScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { ThemeSync } from '@/features/profile/ThemeSync'
import { LearnSession } from '@/features/learn/LearnSession'
import { LanguageSelect } from '@/features/onboarding/LanguageSelect'
import { ParentPanel } from '@/features/parent/ParentPanel'
import { ReviewScreen } from '@/features/review/ReviewScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { setAppLocale } from '@/lib/i18n'
import { useHydrated } from '@/lib/hooks/useHydrated'
import { useProgressStore } from '@/lib/progress/store'

function RouteShell() {
  const hydrated = useHydrated()
  const done = useProgressStore((s) => s.hasCompletedLanguageSelect)
  const locale = useProgressStore((s) => s.locale)
  const location = useLocation()

  useEffect(() => {
    setAppLocale(locale)
  }, [locale])

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-6 text-lg font-extrabold text-[var(--muted)]">
        …
      </div>
    )
  }

  if (!done && location.pathname !== '/language') {
    return <Navigate to="/language" replace />
  }

  if (done && location.pathname === '/language') {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <ThemeSync />
      <Outlet />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<RouteShell />}>
        <Route path="/language" element={<LanguageSelect />} />
        <Route path="/" element={<HomeScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/learn" element={<LearnSession />} />
        <Route path="/games" element={<GamesHub />} />
        <Route path="/games/balloon" element={<BalloonGame />} />
        <Route path="/games/match" element={<MatchGame />} />
        <Route path="/games/memory" element={<MemoryGame />} />
        <Route path="/games/sprint" element={<SprintGame />} />
        <Route path="/games/boss" element={<BossGame />} />
        <Route path="/review" element={<ReviewScreen />} />
        <Route path="/parent" element={<ParentPanel />} />
        <Route path="/badges" element={<BadgesScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
