import type { CoachContext } from './types'

export type ParentExplanation = {
  childMayStruggle: string
  howToHelp: string
  explanationPath: string
}

export function generateParentExplanation(
  context: CoachContext,
  locale: 'tr' | 'en',
): ParentExplanation {
  const { a, b, variant } = context
  const answer = a * b
  const nearBase = Math.max(1, a <= 5 ? a - 1 : 5)
  const nearResult = nearBase * b

  if (locale === 'tr') {
    switch (variant) {
      case 'standard':
        return {
          childMayStruggle: `Çocuk ${a}×${b}'yi doğrudan hatırlamakta zorlanıyor olabilir.`,
          howToHelp: `Önce ${nearBase}×${b}'yi sorun, sonra bir tane daha ${b} ekletin.`,
          explanationPath: `${nearBase}×${b}=${nearResult}, +${b} = ${answer}`,
        }
      case 'reverse_missing_a':
        return {
          childMayStruggle: `Çocuk "kaç tane ${b} ile ${answer} elde edilir?" sorusunda zorlanıyor olabilir.`,
          howToHelp: `${b}'er ${b}'er saydırın: ${b}, ${b * 2}, ${b * 3}... ${answer}'a ulaşana kadar.`,
          explanationPath: `${b}'er sayarak ${answer}'a ulaşmak ${a} adım alır → cevap ${a}`,
        }
      case 'reverse_missing_b':
        return {
          childMayStruggle: `Çocuk "${a} ile hangi sayıyı çarpmak ${answer} verir?" sorusunda zorlanıyor olabilir.`,
          howToHelp: `${a}'er ${a}'er saydırın: ${a}, ${a * 2}, ${a * 3}... ${answer}'a ulaşana kadar.`,
          explanationPath: `${a}'er sayarak ${answer}'a ulaşmak ${b} adım alır → cevap ${b}`,
        }
      case 'twodigit': {
        const ten = Math.floor(a / 10) * 10
        const rem = a % 10
        return {
          childMayStruggle: `Çocuk ${a}×${b} gibi iki basamaklı çarpmada zorlanıyor olabilir.`,
          howToHelp: `${a}'i ${ten} ve ${rem} olarak ayırın. Önce ${ten}×${b}, sonra ${rem}×${b} yaptırın, sonra toplayın.`,
          explanationPath: `${ten}×${b}=${ten * b}, ${rem}×${b}=${rem * b}, toplam = ${answer}`,
        }
      }
      default:
        return {
          childMayStruggle: `Çocuk bu soruyla ilgili zorlanıyor olabilir.`,
          howToHelp: `Soruyu küçük adımlara bölün ve birlikte sayın.`,
          explanationPath: `${a}×${b}=${answer}`,
        }
    }
  }

  // English
  switch (variant) {
    case 'standard':
      return {
        childMayStruggle: `Child may not recall ${a}×${b} directly.`,
        howToHelp: `Ask them ${nearBase}×${b} first, then add one more ${b}.`,
        explanationPath: `${nearBase}×${b}=${nearResult}, +${b} = ${answer}`,
      }
    case 'reverse_missing_a':
      return {
        childMayStruggle: `Child may struggle with "how many ${b}s make ${answer}?".`,
        howToHelp: `Count by ${b}s together: ${b}, ${b * 2}, ${b * 3}... until you reach ${answer}.`,
        explanationPath: `Counting by ${b}s to reach ${answer} takes ${a} steps → answer is ${a}`,
      }
    case 'reverse_missing_b':
      return {
        childMayStruggle: `Child may struggle with "what times ${a} gives ${answer}?".`,
        howToHelp: `Count by ${a}s together: ${a}, ${a * 2}, ${a * 3}... until you reach ${answer}.`,
        explanationPath: `Counting by ${a}s to reach ${answer} takes ${b} steps → answer is ${b}`,
      }
    case 'twodigit': {
      const ten = Math.floor(a / 10) * 10
      const rem = a % 10
      return {
        childMayStruggle: `Child may struggle with two-digit multiplication like ${a}×${b}.`,
        howToHelp: `Split ${a} into ${ten} and ${rem}. Do ${ten}×${b} then ${rem}×${b}, then add them.`,
        explanationPath: `${ten}×${b}=${ten * b}, ${rem}×${b}=${rem * b}, total = ${answer}`,
      }
    }
    default:
      return {
        childMayStruggle: `Child may be struggling with this question.`,
        howToHelp: `Break the problem into small steps and count together.`,
        explanationPath: `${a}×${b}=${answer}`,
      }
  }
}
