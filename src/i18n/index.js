import { en } from './en.js'
import { hi } from './hi.js'
import { kn } from './kn.js'

const locales = { en, hi, kn }
let currentLocale = 'en'

export function setLocale(lang) {
  if (locales[lang]) { currentLocale = lang }
  document.documentElement.setAttribute('lang', currentLocale)
  // dispatch a custom event so views can re-render
  document.dispatchEvent(new CustomEvent('localechange', { detail: { lang: currentLocale } }))
}

export function getLocale() { return currentLocale }

// t('nav.senior') → looks up locales[currentLocale].nav.senior
// Falls back to en if key missing
export function t(key) {
  const parts = key.split('.')
  let val = locales[currentLocale]
  for (const p of parts) { val = val?.[p] }
  if (val !== undefined) return val
  // fallback
  val = locales.en
  for (const p of parts) { val = val?.[p] }
  return val ?? key
}
