import type { CoachHint } from './types'

const TITLES = {
  en: 'A little help 💡',
  tr: 'Küçük bir ipucu 💡',
}

export function standardHint(a: number, b: number, level: 1 | 2 | 3 | 4, locale: 'tr' | 'en'): CoachHint {
  // Use a-1 as near base, but clamp to at least 1
  const nearBase = Math.max(1, a <= 5 ? a - 1 : 5)
  const nearResult = nearBase * b
  const answer = a * b

  const messages: Record<typeof locale, Record<typeof level, string>> = {
    en: {
      1: `What is ${nearBase} times ${b}?`,
      2: `Add one more ${b}.`,
      3: `Try ${nearResult} + ${b}.`,
      4: `It is ${answer}. Because ${nearResult} + ${b} = ${answer}.`,
    },
    tr: {
      1: `${nearBase} tane ${b} kaç?`,
      2: `Bir tane daha ${b} ekle.`,
      3: `${nearResult} + ${b} yap.`,
      4: `${answer}. Çünkü ${nearResult} + ${b} = ${answer}.`,
    },
  }

  return {
    level,
    title: TITLES[locale],
    message: messages[locale][level],
    strategy: 'near_fact',
    revealAnswer: level === 4,
  }
}

export function reverseHint(
  b: number,
  answer: number,
  level: 1 | 2 | 3 | 4,
  locale: 'tr' | 'en',
): CoachHint {
  const result = answer / b
  const countSample = [b, b * 2, b * 3].filter((n) => n <= answer).join(', ')

  const messages: Record<typeof locale, Record<typeof level, string>> = {
    en: {
      1: `Let's count by ${b}s.`,
      2: `${countSample}...`,
      3: `Stop when you reach ${answer}.`,
      4: `${result}. Because we counted ${b}, ${result} times.`,
    },
    tr: {
      1: `${b}'er sayalım.`,
      2: `${countSample}...`,
      3: `${answer}'a gelince dur.`,
      4: `${result}. Çünkü ${b}'i ${result} kez saydık.`,
    },
  }

  return {
    level,
    title: TITLES[locale],
    message: messages[locale][level],
    strategy: 'skip_count',
    revealAnswer: level === 4,
  }
}

export function twodigitHint(a: number, b: number, level: 1 | 2 | 3 | 4, locale: 'tr' | 'en'): CoachHint {
  const ten = Math.floor(a / 10) * 10
  const rem = a % 10
  const tenResult = ten * b
  const remResult = rem * b
  const answer = a * b

  const messages: Record<typeof locale, Record<typeof level, string>> = {
    en: {
      1: `Let's split ${a}.`,
      2: `Make ${ten} and ${rem}.`,
      3: `${ten}×${b} and ${rem}×${b}.`,
      4: `${tenResult} + ${remResult} = ${answer}.`,
    },
    tr: {
      1: `${a}'ı ayıralım.`,
      2: `${ten} ve ${rem} yap.`,
      3: `${ten}×${b} ve ${rem}×${b}.`,
      4: `${tenResult} + ${remResult} = ${answer}.`,
    },
  }

  return {
    level,
    title: TITLES[locale],
    message: messages[locale][level],
    strategy: 'decompose',
    revealAnswer: level === 4,
  }
}

export function fallbackHint(level: 1 | 2 | 3 | 4, locale: 'tr' | 'en'): CoachHint {
  const messages: Record<typeof locale, Record<typeof level, string>> = {
    en: {
      1: "Let's break it into small parts.",
      2: 'Think about what you know.',
      3: "Let's count together.",
      4: "Let's try together.",
    },
    tr: {
      1: 'Küçük parçalara bakalım.',
      2: 'Bildiklerini düşün.',
      3: 'Hadi birlikte sayalım.',
      4: 'Hadi birlikte bakalım.',
    },
  }

  return {
    level,
    title: TITLES[locale],
    message: messages[locale][level],
    revealAnswer: level === 4,
  }
}
