import { en } from './en.js'
import { hi } from './hi.js'
import { kn } from './kn.js'
import { getStore, setStore, KEYS } from '../modules/store.js'

const locales = { en, hi, kn }
const SUPPORTED_LOCALES = ['en', 'hi', 'kn']
const LOCALE_CODES = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' }
let currentLocale = 'en'

function getNestedValue(locale, key) {
  return key.split('.').reduce((value, part) => value?.[part], locales[locale])
}

function getStoredLocale() {
  const settings = getStore(KEYS.SETTINGS)
  const profile = getStore(KEYS.PROFILE)
  const stored = settings?.language ?? profile?.language
  return SUPPORTED_LOCALES.includes(stored) ? stored : 'en'
}

export function initLocale() {
  currentLocale = getStoredLocale()
  applyLocale()
  return currentLocale
}

function applyLocale() {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('lang', currentLocale)
  document.documentElement.setAttribute('data-lang', currentLocale)
  const liveRegion = typeof document.getElementById === 'function'
    ? document.getElementById('locale-live-region')
    : null
  if (liveRegion) liveRegion.textContent = t('a11y.languageChanged', { language: t(`languageNames.${currentLocale}`) })
  document.dispatchEvent(new CustomEvent('localechange', { detail: { lang: currentLocale } }))
}

export function setLocale(lang) {
  currentLocale = SUPPORTED_LOCALES.includes(lang) ? lang : 'en'
  const settings = getStore(KEYS.SETTINGS) || {}
  const profile = getStore(KEYS.PROFILE) || {}
  setStore(KEYS.SETTINGS, { ...settings, language: currentLocale })
  setStore(KEYS.PROFILE, { ...profile, language: currentLocale })
  applyLocale()
}

export function getLocale() { return currentLocale }
export function getLocaleCode() { return LOCALE_CODES[currentLocale] }

export function t(key, params = {}) {
  let value = getNestedValue(currentLocale, key)
  if (value === undefined) value = getNestedValue('en', key)
  if (value === undefined) {
    if (import.meta.env?.DEV) console.warn(`[i18n] Missing translation key: ${key}`)
    return key
  }
  return String(value).replace(/\{(\w+)\}/g, (match, token) => (
    Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : match
  ))
}

export { locales, SUPPORTED_LOCALES }
