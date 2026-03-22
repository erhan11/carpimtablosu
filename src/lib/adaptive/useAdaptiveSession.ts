import { useEffect, useRef } from 'react'
import type { AdaptiveGameMode } from '@/lib/adaptive/adaptive'
import { useProgressStore } from '@/lib/progress/store'

/** Record which game mode was used for adaptive practice for this fact (rotation). */
export function useRecordAdaptiveSession(mode: AdaptiveGameMode, factKey: string | null) {
  const recordAdaptivePlay = useProgressStore((s) => s.recordAdaptivePlay)
  const recorded = useRef(false)

  useEffect(() => {
    if (!factKey || recorded.current) return
    recorded.current = true
    recordAdaptivePlay(factKey, mode)
  }, [factKey, mode, recordAdaptivePlay])
}
