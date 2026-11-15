import { beforeEach, describe, expect, it } from 'vitest'
import { initStore, getStore, KEYS } from '../modules/store.js'
import { createWelcomeStepper, hasSeenWelcome, markWelcomeSeen, shouldShowWelcome } from '../modules/welcomeState.js'

describe('welcome guide state', () => {
  beforeEach(() => {
    const data = {}
    globalThis.localStorage = {
      getItem: (key) => data[key] ?? null,
      setItem: (key, value) => { data[key] = String(value) },
      removeItem: (key) => { delete data[key] },
      clear: () => Object.keys(data).forEach((key) => delete data[key]),
      key: (index) => Object.keys(data)[index] ?? null,
      get length() { return Object.keys(data).length },
    }
    initStore()
  })

  it('shows on first visit, persists after closing, and shows again for invalid data', () => {
    expect(shouldShowWelcome()).toBe(true)
    expect(markWelcomeSeen()).toBe(true)
    expect(hasSeenWelcome()).toBe(true)
    initStore()
    expect(shouldShowWelcome()).toBe(false)

    localStorage.setItem(KEYS.WELCOME_SEEN, 'not-json')
    expect(shouldShowWelcome()).toBe(true)
    expect(getStore(KEYS.WELCOME_SEEN)).toBe(false)
  })

  it('moves through all six steps without changing the state logic', () => {
    const stepper = createWelcomeStepper()
    expect(stepper.current).toBe(1)
    expect(stepper.next()).toBe(2)
    expect(stepper.next()).toBe(3)
    expect(stepper.goTo(6)).toBe(6)
    expect(stepper.next()).toBe(6)
    expect(stepper.back()).toBe(5)
    expect(stepper.goTo(0)).toBe(1)
  })
})
