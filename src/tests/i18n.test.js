import { describe, it, expect, beforeEach } from 'vitest'
import { t, setLocale, getLocale } from '../i18n/index.js'

describe('i18n engine', () => {
  beforeEach(() => {
    // Setup mock document for node environment
    globalThis.document = {
      documentElement: {
        setAttribute: () => {},
      },
      dispatchEvent: () => {},
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
})
