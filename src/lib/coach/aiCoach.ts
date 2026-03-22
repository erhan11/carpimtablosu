import type { CoachContext, CoachHint } from './types'
import { standardHint, reverseHint, twodigitHint, fallbackHint } from './hintStrategies'

function isValidContext(ctx: CoachContext): boolean {
  return (
    Number.isInteger(ctx.a) &&
    Number.isInteger(ctx.b) &&
    ctx.a >= 1 &&
    ctx.a <= 99 &&
    ctx.b >= 1 &&
    ctx.b <= 12
  )
}

export function getCoachHint(
  context: CoachContext,
  level: 1 | 2 | 3 | 4,
  locale: 'tr' | 'en',
): CoachHint {
  if (!isValidContext(context)) {
    return fallbackHint(level, locale)
  }

  const { a, b, variant } = context

  switch (variant) {
    case 'standard':
      return standardHint(a, b, level, locale)

    case 'reverse_missing_a': {
      // ? × b = a*b → answer is a, count by b to reach a*b
      const answer = a * b
      return reverseHint(b, answer, level, locale)
    }

    case 'reverse_missing_b': {
      // a × ? = a*b → answer is b, count by a to reach a*b
      const answer = a * b
      return reverseHint(a, answer, level, locale)
    }

    case 'twodigit':
      return twodigitHint(a, b, level, locale)

    default:
      return standardHint(a, b, level, locale)
  }
}
