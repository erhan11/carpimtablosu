import { useEffect, useState } from 'react'
import { useProgressStore } from '@/lib/progress/store'

export function useHydrated() {
  const [hydrated, setHydrated] = useState(() => useProgressStore.persist.hasHydrated())

  useEffect(() => {
    return useProgressStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
  }, [])

  return hydrated
}
