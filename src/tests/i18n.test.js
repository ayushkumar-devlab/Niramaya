import { describe, it, expect, beforeEach } from 'vitest'
import { t, setLocale, getLocale, initLocale, locales } from '../i18n/index.js'

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    return child && typeof child === 'object' ? flattenKeys(child, fullKey) : [fullKey]
  })
}

describe('i18n engine', () => {
  beforeEach(() => {
    // Setup mock document for node environment
    globalThis.document = {
      documentElement: {
        setAttribute: () => {},
      },
      getElementById: () => null,
      dispatchEvent: () => {},
    }
    const data = new Map()
    globalThis.localStorage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: (key) => data.delete(key),
      get length() { return data.size },
      key: (index) => Array.from(data.keys())[index] ?? null,
    }
    setLocale('en')
  })

  it('translates English keys properly', () => {
    expect(t('app.name')).toBe('Niramaya')
    expect(t('nav.senior')).toBe('Senior Mode')
    expect(t('nav.caregiver')).toBe('Caregiver')
    expect(t('nav.emergency')).toBe('Emergency')
    expect(t('nav.safety')).toBe('Safety Check')
    expect(t('nav.settings')).toBe('Settings')
  })

  it('switches to Hindi and returns translated text', () => {
    setLocale('hi')
    expect(getLocale()).toBe('hi')
    expect(t('app.name')).toBe('निरामय')
    expect(t('nav.senior')).toBe('सीनियर मोड')
    expect(t('common.save')).toBe('सहेजें')
  })

  it('switches to Kannada and returns translated text', () => {
    setLocale('kn')
    expect(getLocale()).toBe('kn')
    expect(t('app.name')).toBe('ನಿರಾಮಯ')
    expect(t('nav.senior')).toBe('ಹಿರಿಯರ ಮೋಡ್')
    expect(t('common.save')).toBe('ಉಳಿಸಿ')
  })

  it('falls back to English when a key or language is missing', () => {
    setLocale('nonexistent')
    expect(t('app.name')).toBe('Niramaya')

    setLocale('en')
    expect(t('unmapped.random.key')).toBe('unmapped.random.key')
  })

  it('interpolates placeholders and updates the document language', () => {
    const attributes = {}
    document.documentElement.setAttribute = (key, value) => { attributes[key] = value }
    setLocale('hi')
    expect(t('senior.nextDoseAt', { time: '8:00 AM' })).toContain('8:00 AM')
    expect(attributes.lang).toBe('hi')
    setLocale('kn')
    expect(attributes.lang).toBe('kn')
  })

  it('persists a selected language and rejects invalid stored values', () => {
    setLocale('hi')
    initLocale()
    expect(getLocale()).toBe('hi')
    localStorage.setItem('nm_settings', JSON.stringify({ language: 'xx' }))
    initLocale()
    expect(getLocale()).toBe('en')
  })

  it('keeps locale keys and placeholders in parity', () => {
    const englishKeys = flattenKeys(locales.en)
    for (const language of ['hi', 'kn']) {
      const keys = flattenKeys(locales[language])
      expect(keys.sort()).toEqual([...englishKeys].sort())
      for (const key of englishKeys) {
        expect(t(key)).not.toBe('')
      }
    }
    const placeholders = (value) => [...String(value).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
    for (const key of englishKeys) {
      const read = (locale) => key.split('.').reduce((value, part) => value[part], locales[locale])
      expect(placeholders(read('en'))).toEqual(placeholders(read('hi')))
      expect(placeholders(read('en'))).toEqual(placeholders(read('kn')))
    }
  })
})
