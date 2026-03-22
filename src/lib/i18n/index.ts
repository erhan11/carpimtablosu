import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from '@/locales/en/common.json'
import enGames from '@/locales/en/games.json'
import enHome from '@/locales/en/home.json'
import enLearn from '@/locales/en/learn.json'
import enParent from '@/locales/en/parent.json'
import enProfile from '@/locales/en/profile.json'
import enSettings from '@/locales/en/settings.json'
import trCommon from '@/locales/tr/common.json'
import trGames from '@/locales/tr/games.json'
import trHome from '@/locales/tr/home.json'
import trLearn from '@/locales/tr/learn.json'
import trParent from '@/locales/tr/parent.json'
import trProfile from '@/locales/tr/profile.json'
import trSettings from '@/locales/tr/settings.json'

export const defaultNS = 'common'
export const namespaces = [
  'common',
  'home',
  'learn',
  'games',
  'parent',
  'profile',
  'settings',
] as const

function initialLanguage(): string {
  if (typeof window === 'undefined') return 'tr'
  const stored = window.localStorage.getItem('app_locale')
  if (stored === 'tr' || stored === 'en') return stored
  return window.navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

void i18n.use(initReactI18next).init({
    resources: {
      tr: {
        common: trCommon,
        home: trHome,
        learn: trLearn,
        games: trGames,
        parent: trParent,
        profile: trProfile,
        settings: trSettings,
      },
      en: {
        common: enCommon,
        home: enHome,
        learn: enLearn,
        games: enGames,
        parent: enParent,
        profile: enProfile,
        settings: enSettings,
      },
    },
    lng: initialLanguage(),
    fallbackLng: 'en',
    defaultNS,
    ns: namespaces,
    interpolation: { escapeValue: false },
  })

export function setAppLocale(lng: 'tr' | 'en') {
  window.localStorage.setItem('app_locale', lng)
  void i18n.changeLanguage(lng)
}

export { i18n }
