import { beforeEach, describe, expect, it } from 'vitest'
import { registerConnectivityListeners } from '../modules/connectivity.js'
import { initStore } from '../modules/store.js'
import { initLocale, t } from '../i18n/index.js'

describe('connectivity indicator events', () => {
  beforeEach(() => {
    let storage = {}
    globalThis.localStorage = {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, value) => { storage[key] = String(value) },
      removeItem: (key) => { delete storage[key] },
      get length() { return Object.keys(storage).length },
      key: (index) => Object.keys(storage)[index] || null,
    }
    globalThis.document = undefined
    initStore()
    initLocale()
  })

  it('uses the initial navigator state and responds to offline/online events', () => {
    const target = new EventTarget()
    Object.defineProperty(target, 'navigator', { value: { onLine: true } })
    const changes = []
    const controller = registerConnectivityListeners(target, (isOnline) => changes.push(isOnline))

    expect(controller.initial).toBe(true)
    target.dispatchEvent(new Event('offline'))
    target.dispatchEvent(new Event('online'))
    expect(changes).toEqual([false, true])
    controller.destroy()
  })

  it('provides translated messages for both state changes', () => {
    expect(t('toast.offline')).toContain('You are offline')
    expect(t('toast.backOnline')).toBe('Back online.')
  })
})
