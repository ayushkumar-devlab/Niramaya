import { getStore, setStore, KEYS } from './store.js'

export const TEXT_SIZES = ['normal', 'large', 'xlarge']

export function getSettings() {
  return getStore(KEYS.SETTINGS) || {}
}

export function saveSettings(updates, { notify = true } = {}) {
  const next = { ...getSettings(), ...updates }
  setStore(KEYS.SETTINGS, next)
  if (notify && typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('settingschange', { detail: next }))
  }
  return next
}

export function applySettingsToDocument(settings = getSettings()) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  if (settings.seniorMode) html.setAttribute('data-senior', 'true')
  else html.removeAttribute('data-senior')
  if (settings.highContrast) html.setAttribute('data-high-contrast', 'true')
  else html.removeAttribute('data-high-contrast')
  html.setAttribute('data-text-size', TEXT_SIZES.includes(settings.fontSize) ? settings.fontSize : 'normal')
  html.setAttribute('data-reduce-motion', ['system', 'on', 'off'].includes(settings.reduceMotion) ? settings.reduceMotion : 'system')
  const fontSizes = { normal: '16px', large: '18px', xlarge: '20px' }
  html.style.fontSize = fontSizes[settings.fontSize] || fontSizes.normal
}

export function nextTextSize(current, direction) {
  const index = Math.max(0, TEXT_SIZES.indexOf(current))
  const next = direction === 'up' ? Math.min(TEXT_SIZES.length - 1, index + 1) : Math.max(0, index - 1)
  return TEXT_SIZES[next]
}
