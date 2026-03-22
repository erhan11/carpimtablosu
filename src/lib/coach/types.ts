export type CoachContext = {
  a: number
  b: number
  variant: 'standard' | 'reverse_missing_a' | 'reverse_missing_b' | 'twodigit'
  wrongAttemptsOnCurrentQuestion: number
  responseMs?: number
  masteryLevel?: number
  gameMode: 'learn' | 'sprint' | 'boss' | 'speed' | 'mixed'
  advancedMode: boolean
  expertMode: boolean
}

export type CoachHint = {
  level: 1 | 2 | 3 | 4
  title: string
  message: string
  strategy?: 'groups' | 'skip_count' | 'near_fact' | 'decompose' | 'reverse_reasoning'
  revealAnswer?: boolean
}
