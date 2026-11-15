import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { initStore, getStore, KEYS } from '../modules/store.js'
import { hasSeenWelcome, markWelcomeSeen, shouldShowWelcome } from '../modules/welcomeState.js'

const welcomeSource = readFileSync(new URL('../components/welcome.js', import.meta.url), 'utf8')
const settingsSource = readFileSync(new URL('../views/settings.js', import.meta.url), 'utf8')

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

  it('renders a single compact welcome screen with one primary action', () => {
    expect(welcomeSource).not.toContain('welcome-progress')
    expect(welcomeSource).not.toContain('class="btn btn-ghost welcome-back')
    expect(welcomeSource).not.toContain('class="btn btn-ghost welcome-skip')
    expect(welcomeSource).not.toContain('class="btn btn-secondary welcome-read')
    expect(welcomeSource).not.toContain('createWelcomeStepper')
    expect(welcomeSource.match(/class="btn btn-primary/g)).toHaveLength(1)
    expect(welcomeSource).toContain("setAttribute('role', 'dialog')")
  })

  it('uses the same close path for Get started, close, and Escape', () => {
    expect(welcomeSource).toContain("welcome-start').addEventListener('click', close)")
    expect(welcomeSource).toContain("welcome-close').addEventListener('click', close)")
    expect(welcomeSource).toContain("if (event.key === 'Escape')")
    expect(welcomeSource).toContain('if (markSeenOnClose) markWelcomeSeen()')
  })

  it('keeps manual reopening non-persistent', () => {
    expect(welcomeSource).toContain('markSeenOnClose = false')
    expect(settingsSource).toContain("openWelcomeGuide({ markSeenOnClose: false })")
  })
})
