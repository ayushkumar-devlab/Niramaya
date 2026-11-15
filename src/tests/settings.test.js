import { beforeEach, describe, expect, it } from 'vitest'
import { getStore, initStore, KEYS } from '../modules/store.js'
import { applySettingsToDocument, getSettings, nextTextSize, saveSettings, TEXT_SIZES } from '../modules/settings.js'

describe('settings state', () => {
  beforeEach(() => {
    let storage = {}
    globalThis.localStorage = {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, value) => { storage[key] = String(value) },
      removeItem: (key) => { delete storage[key] },
      get length() { return Object.keys(storage).length },
      key: (index) => Object.keys(storage)[index] || null,
    }
    globalThis.document = {
      dispatchEvent: () => {},
      documentElement: { setAttribute: () => {}, removeAttribute: () => {}, toggleAttribute: () => {}, style: {} },
    }
    initStore()
  })

  it('persists language, Senior Mode, text size, and speech speed', () => {
    saveSettings({ language: 'hi', seniorMode: true, fontSize: 'large', speechRate: 1.1 })
    expect(getSettings()).toMatchObject({ language: 'hi', seniorMode: true, fontSize: 'large', speechRate: 1.1 })
    expect(getStore(KEYS.SETTINGS).fontSize).toBe('large')
  })

  it('clamps text size controls to supported values', () => {
    expect(nextTextSize('normal', 'down')).toBe(TEXT_SIZES[0])
    expect(nextTextSize('xlarge', 'up')).toBe(TEXT_SIZES[2])
    expect(nextTextSize('normal', 'up')).toBe('large')
  })

  it('applies the persisted text size to the root immediately', () => {
    saveSettings({ fontSize: 'xlarge' })
    applySettingsToDocument()
    expect(document.documentElement.style.fontSize).toBe('20px')
  })
})
